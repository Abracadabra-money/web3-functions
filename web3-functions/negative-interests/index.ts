import {
	Web3Function,
	type Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";
import { Interface } from "ethers/lib/utils";
import ky from "ky";
import type { Address } from "viem";
import { odosQuote } from "../../utils/odos";
import { SimulationUrlBuilder } from "../../utils/tenderly";

const lensAbi = [
	"function previewAccrue(address) external view returns(uint128)",
];

const strategyAbi = [
	"function swapAndwithdrawFees(uint256,address,bytes) external returns (uint256 amountOut)",
	"function setInterest(uint256) external",
	"function withdrawFees() external returns (uint256)",
	"function strategyToken() external view returns(address)",
	"function pendingFeeEarned() external view returns(uint128)",
	"function bentoBox() external view returns(address)",
	"function getYearlyInterestBips() external view returns (uint256)",
];

const boxAbi = [
	"function balanceOf(address token,address account) external view returns(uint256)",
	"function toAmount(address token,uint256 share,bool roundUp) external view returns(uint256)",
	"function strategyData(address) external view returns(uint64 strategyStartDate,uint64 targetPercentage,uint128 balance)",
];

const oracleAbi = ["function latestAnswer() external view returns (int256)"];

const cauldronAbi = [
	"function totalBorrow() external view returns(uint128 elastic,uint128 base)",
];

const erc20Abi = [
	"function balanceOf(address) external view returns (uint256)",
];

const BIPS = 10_000;
const GELATO_PROXY = "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3";

Web3Function.onRun(async (context: Web3FunctionContext) => {
	const { userArgs, storage, multiChainProvider } = context;
	const provider = multiChainProvider.default();

	const odosApiEndpoint = userArgs.odosApiEndpoint as string;
	const intervalInSeconds = userArgs.intervalInSeconds as number;
	const swapRewards = odosApiEndpoint.trim() !== "";

	// WBTC strat: 0x186d76147A226A51a112Bb1958e8b755ab9FD1aF
	// WETH strat: 0xcc0d7aF1f809dD3A589756Bba36Be04D19e9C6c5
	// CRV strat: 0xa5ABd043aaafF2cDb0de3De45a010F0355a1c6E7
	const execAddress = userArgs.execAddress as Address;
	const strategyAddress = userArgs.strategyAddress as Address;
	const rewardSwappingSlippageInBips =
		userArgs.rewardSwappingSlippageInBips as number;
	const maxBentoBoxAmountIncreaseInBips =
		userArgs.maxBentoBoxAmountIncreaseInBips as number;
	const maxBentoBoxChangeAmountInBips =
		userArgs.maxBentoBoxChangeAmountInBips as number;
	const interestAdjusterType = userArgs.interestAdjusterType as string;
	const interestAdjusterParameters =
		userArgs.interestAdjusterParameters as string;
	const swapToAddress = userArgs.swapToAddress as Address;

	const strategy = new Contract(strategyAddress, strategyAbi, provider);
	const box = new Contract(await strategy.bentoBox(), boxAbi, provider);
	const lastTimestampStr = (await storage.get("lastTimestamp")) ?? "0";
	const lastTimestamp = Number.parseInt(lastTimestampStr);

	// Check if it's ready for a new update
	const timestamp = (await provider.getBlock("latest")).timestamp;

	console.log(`Next update: ${lastTimestamp + intervalInSeconds}`);
	if (timestamp < lastTimestamp + intervalInSeconds) {
		return { canExec: false, message: "Time not elapsed" };
	}

	const strategyToken = await strategy.strategyToken();
	if (!strategyToken) throw Error("strategyToken call failed");

	// biome-ignore lint/suspicious/noExplicitAny: untyped
	let runCalldata: any = [];

	switch (interestAdjusterType) {
		case "CRV_AIP_13_6":
			runCalldata = [
				...runCalldata,
				...(await handle_AIP_13_6(
					interestAdjusterParameters.split(","),
					box,
					strategy,
					provider,
				)),
			];

			break;
	}

	const strategyIface = new Interface(strategyAbi);

	if (swapRewards) {
		const lens = "0xfd2387105ee3ccb0d96b7de2d86d26344f17787b";
		const lensContract = new Contract(lens, lensAbi, provider);
		let response = await lensContract.previewAccrue(strategy.address);
		if (!response) throw Error("failed to call previewAccrue");
		let totalPendingFees = BigNumber.from(response);
		console.log(`Pending accrued interest: ${totalPendingFees.toString()}`);
		response = await strategy.pendingFeeEarned();
		totalPendingFees = totalPendingFees.add(BigNumber.from(response));

		if (totalPendingFees.gt(BigNumber.from(0))) {
			const quote = await odosQuote({
				endpoint: odosApiEndpoint,
				chainId: multiChainProvider.default().network.chainId,
				inputTokens: [
					{ tokenAddress: strategyToken, amount: totalPendingFees.toBigInt() },
				] as const,
				outputTokens: [{ tokenAddress: swapToAddress, proportion: 1 }] as const,
				userAddr: strategyAddress,
				disableRFQs: false,
			});

			const toTokenAmount = BigNumber.from(quote.outputTokens[0].amount);

			const data = quote.transaction.data;

			const minAmountOut = toTokenAmount.sub(
				toTokenAmount.mul(rewardSwappingSlippageInBips).div(BIPS),
			);

			console.log(minAmountOut);

			runCalldata.push(
				strategyIface.encodeFunctionData("swapAndwithdrawFees", [
					minAmountOut.toString(),
					swapToAddress,
					data,
				]),
			);
		}
	}
	// simply withdraw fees
	else {
		runCalldata.push(strategyIface.encodeFunctionData("withdrawFees", []));
	}

	const iface = new Interface([
		"function run(address,uint256,uint256,bytes[]) external",
	]);

	const callData = {
		to: execAddress,
		data: iface.encodeFunctionData("run", [
			strategyAddress,
			maxBentoBoxAmountIncreaseInBips.toString(),
			maxBentoBoxChangeAmountInBips.toString(),
			runCalldata.length > 0 ? runCalldata : "[]",
		]),
	};

	SimulationUrlBuilder.log(
		[GELATO_PROXY],
		[execAddress],
		[0],
		[callData.data],
		[1],
	);

	await storage.set("lastTimestamp", timestamp.toString());

	return { canExec: true, callData: [callData] };
});

// https://forum.abracadabra.money/t/aip-13-6-further-amendment-on-interest-rate/4325
async function handle_AIP_13_6(
	cauldrons: string[],
	box: Contract,
	strategy: Contract,
	// biome-ignore lint/suspicious/noExplicitAny: untyped
	provider: any,
): Promise<string[]> {
	console.log("Using AIP_13_6 interest adjusting...");
	const crvOracle = new Contract(
		"0xcd627aa160a6fa45eb793d19ef54f5062f20f33f",
		oracleAbi,
		provider,
	);
	const crvAddress = "0xD533a949740bb3306d119CC777fa900bA034cd52";
	const crv = new Contract(crvAddress, erc20Abi, provider);

	const crvPrice = await crvOracle.latestAnswer();
	console.log(`crv price: $${crvPrice.toString() / 1e8}`);

	const crvCauldron1 = new Contract(cauldrons[0], cauldronAbi, provider);
	const crvCauldron2 = new Contract(cauldrons[1], cauldronAbi, provider);
	const crvCauldron1TotalBorrow = await crvCauldron1.totalBorrow();
	const crvCauldron2TotalBorrow = await crvCauldron2.totalBorrow();

	// borrowed + interests
	const principal = crvCauldron1TotalBorrow[0].add(crvCauldron2TotalBorrow[0]);
	console.log(`crvCauldron1TotalBorrow: ${crvCauldron1TotalBorrow.toString()}`);
	console.log(`crvCauldron2TotalBorrow: ${crvCauldron2TotalBorrow.toString()}`);
	console.log(
		`principal (MIM): ${(principal.toString() / 1e18).toLocaleString("us")}`,
	);

	const crvCauldron1CollateralAmount = await box.toAmount(
		crvAddress,
		await box.balanceOf(crvAddress, cauldrons[0]),
		true,
	);
	const crvCauldron2CollateralAmount = await box.toAmount(
		crvAddress,
		await box.balanceOf(crvAddress, cauldrons[1]),
		true,
	);
	console.log(
		`crvCauldron1CollateralAmount: ${crvCauldron1CollateralAmount.toString()}`,
	);
	console.log(
		`crvCauldron2CollateralAmount: ${crvCauldron2CollateralAmount.toString()}`,
	);

	const crvCauldron1CollateralValueInUsd = crvCauldron1CollateralAmount
		.mul(crvPrice)
		.div(BigNumber.from(10).pow(8));
	const crvCauldron2CollateralValueInUsd = crvCauldron2CollateralAmount
		.mul(crvPrice)
		.div(BigNumber.from(10).pow(8));
	console.log(
		`crvCauldron1CollateralValueInUsd: $${(crvCauldron1CollateralValueInUsd.toString() / 1e18).toLocaleString("us")}`,
	);
	console.log(
		`crvCauldron2CollateralValueInUsd: $${(crvCauldron2CollateralValueInUsd.toString() / 1e18).toLocaleString("us")}`,
	);

	// total collateral value USD
	const collateralValueInUsd = crvCauldron1CollateralValueInUsd.add(
		crvCauldron2CollateralValueInUsd,
	);
	console.log(
		`totalCollateralValueInUsd: $${(collateralValueInUsd.toString() / 1e18).toLocaleString("us")}`,
	);

	let interestRate: BigNumber;

	// >= 10M: 150% (15_000 bips)
	if (
		principal.gt(BigNumber.from(10_000_000).mul(BigNumber.from(10).pow(18)))
	) {
		interestRate = BigNumber.from(15_000);
	}
	// >= 5M: 80% (8_000 bips)
	else if (
		principal.gt(BigNumber.from(5_000_000).mul(BigNumber.from(10).pow(18)))
	) {
		interestRate = BigNumber.from(8_000);
	}
	// otherwise: 30% (3_000 bips)
	else {
		interestRate = BigNumber.from(3_000);
	}

	console.log(`base interestRate: ${interestRate.toString()}`);

	// Collateral Ratio
	const collateralRatio = principal
		.mul(100)
		.mul(BigNumber.from(10).pow(18))
		.div(collateralValueInUsd);
	console.log(`collateralRatio: ${collateralRatio.toString() / 1e18}`);

	// <= 40%
	if (collateralRatio.lt(BigNumber.from(40).mul(BigNumber.from(10).pow(18)))) {
		interestRate = interestRate.sub(BigNumber.from(2_000)); // -20% in bips
	}
	// <= 50%
	else if (
		collateralRatio.lt(BigNumber.from(50).mul(BigNumber.from(10).pow(18)))
	) {
		// no change
	}
	// <= 60%
	else if (
		collateralRatio.lt(BigNumber.from(60).mul(BigNumber.from(10).pow(18)))
	) {
		interestRate = interestRate.add(BigNumber.from(1_500)); // +15% in bips
	} else {
		interestRate = interestRate.add(BigNumber.from(2_500)); // +25% in bips
	}

	console.log(`interestRate after ratio: ${interestRate.toString()}`);

	const quoteApi =
		"https://api.curve.fi/api/getPools/ethereum/factory-tricrypto";
	// biome-ignore lint/suspicious/noExplicitAny: untyped
	const quoteApiRes: any = await ky.get(quoteApi).json();

	if (!quoteApiRes.success) throw Error("fail to query curve api");
	const pool = quoteApiRes.data.poolData.find(
		(p: { id: string }) => p.id === "factory-tricrypto-4",
	);
	if (!pool) throw Error("cannot find tricrv pool");

	const liquidityUsd = pool.usdTotal;
	console.log("Pool Liquidity in Usd", liquidityUsd);

	if (liquidityUsd > 30_000_000) {
		interestRate = interestRate.sub(BigNumber.from(2_000)); // -20% in bips
	} else if (liquidityUsd > 20_000_000) {
		interestRate = interestRate.sub(BigNumber.from(1_500)); // -15% in bips
	} else if (liquidityUsd > 10_000_000) {
		interestRate = interestRate.sub(BigNumber.from(1_000)); // -10% in bips
	} else if (liquidityUsd > 5_000_000) {
		interestRate = interestRate.sub(BigNumber.from(500)); // -5% in bips
	}
	console.log(`Final interestRate: ${interestRate.toString()}`);

	const strategyIface = new Interface(strategyAbi);
	const currentInterest = await strategy.getYearlyInterestBips();

	const runCalldata: string[] = [];

	// Need to account for the strategy allocation %
	// When the strategy allocation is 50%, the interest rate should be doubled.
	const strategyData = await box.strategyData(crvAddress);
	const targetPercentage = strategyData[1];
	console.log(`Strategy Allocation: ${targetPercentage.toString()}%`);
	if (targetPercentage.gt(BigNumber.from(0))) {
		const newInterest = interestRate
			.mul(BigNumber.from(100))
			.div(targetPercentage);
		console.log(`${interestRate.toString()} -> ${newInterest.toString()}`);
		interestRate = newInterest;
	}

	if (!currentInterest.eq(interestRate)) {
		runCalldata.push(
			strategyIface.encodeFunctionData("setInterest", [
				interestRate.toString(),
			]),
		);
	} else {
		console.log("Interest rate changed");
	}

	return runCalldata;
}
