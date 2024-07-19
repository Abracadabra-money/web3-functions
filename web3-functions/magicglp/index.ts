import {
	Web3Function,
	type Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";
import { SimulationUrlBuilder } from "../../utils/tenderly";

const HARVESTER_ABI = [
	"function lastExecution() external view returns(uint256)",
	"function totalRewardsBalanceAfterClaiming() external view returns(uint256)",
	"function run(uint256,uint256) external",
];

const LENS_ABI = [
	"function getMintedGlpFromTokenIn(address,uint256) external view returns(uint256, uint256)",
];

const REWARD_TOKEN_ORACLE_ABI = [
	"function latestAnswer() external view returns (int256)",
];

const MAGIC_GLP_ORACLE_ABI = [
	"function peekSpot(bytes) external view returns (uint256)",
	"function oracleImplementation() external view returns (address)",
	"function magicGlp() external view returns (address)",
];

const MAGIC_GLP_ABI = [
	"function totalSupply() external view returns (uint256)",
];
const GELATO_PROXY: Record<number, string> = {
	42161: "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3",
	43114: "0x90ED9a40dc938F1A672Bd158394366c2029d6ca7",
};

Web3Function.onRun(async (context: Web3FunctionContext) => {
	const { userArgs, gelatoArgs, storage, multiChainProvider } = context;
	const provider = multiChainProvider.default();

	// Retrieve Last oracle update time
	const execAddress = userArgs.execAddress as string;
	const intervalInSeconds = userArgs.intervalInSeconds as number;
	const lensAddress = userArgs.lensAddress as string;
	const rewardToken = userArgs.rewardToken as string;
	const mintGlpSlippageInBips = userArgs.mintGlpSlippageInBips as number;
	const rewardTokenChainlinkAddress =
		userArgs.rewardTokenChainlinkAddress as string;
	const magicGlpOracleAddress = userArgs.magicGlpOracleAddress as string;
	const maxApyInBips = userArgs.maxApyInBips as number;
	const maxApyInBipsAsBN = BigNumber.from(maxApyInBips);
	const secondsInOneYear = BigNumber.from("31536000");

	const BIPS = 10_000;

	const oneE8 = BigNumber.from("100000000");
	const harvester = new Contract(execAddress, HARVESTER_ABI, provider);
	const rewardTokenOracle = new Contract(
		rewardTokenChainlinkAddress,
		REWARD_TOKEN_ORACLE_ABI,
		provider,
	);
	const magicGlpOracle = new Contract(
		magicGlpOracleAddress,
		MAGIC_GLP_ORACLE_ABI,
		provider,
	);
	const oracleImplementation = new Contract(
		await magicGlpOracle.oracleImplementation(),
		MAGIC_GLP_ORACLE_ABI,
		provider,
	);
	const magicGlp = new Contract(
		await oracleImplementation.magicGlp(),
		MAGIC_GLP_ABI,
		provider,
	);

	const lastTimestampStr = (await storage.get("lastTimestamp")) ?? "0";
	const lastTimestamp = Number.parseInt(lastTimestampStr);

	// Check if it's ready for a new update
	const timestamp = (await provider.getBlock("latest")).timestamp;

	console.log(`Next update: ${lastTimestamp + intervalInSeconds}`);
	if (timestamp < lastTimestamp + intervalInSeconds) {
		return { canExec: false, message: "Time not elapsed" };
	}

	let rewardTokenAmount: BigNumber;
	try {
		rewardTokenAmount = BigNumber.from(
			await harvester.totalRewardsBalanceAfterClaiming(),
		).add(await provider.getBalance(harvester.address));
	} catch (err) {
		return { canExec: false, message: "Rpc call failed" };
	}

	if (rewardTokenAmount.gt(0)) {
		let mintGlpAmount: BigNumber;
		try {
			const peekSpotPrice = await magicGlpOracle.peekSpot("0x");
			const totalSupply = await magicGlp.totalSupply();
			const rewardPrice = await rewardTokenOracle.latestAnswer(); // assume it's 8 decimals
			const rewardTotalValue = rewardPrice.mul(rewardTokenAmount).div(oneE8); // assume reward token is 18 decimals
			const magicGlpTotalValue = BigNumber.from("10")
				.pow("18")
				.mul(totalSupply)
				.div(peekSpotPrice);
			const magicGlpTotalValueInFloat =
				(magicGlpTotalValue.toString() as unknown as number) / 1e18;
			const rewardTotalValueInFloat =
				(rewardTotalValue.toString() as unknown as number) / 1e18;
			const timeElapsed = timestamp - lastTimestamp;

			console.log(
				"reward amount",
				(
					(rewardTokenAmount.toString() as unknown as number) / 1e18
				).toLocaleString(),
			);
			console.log(
				"reward price: ",
				`$${((rewardPrice.toString() as unknown as number) / 1e8).toLocaleString()}`,
			);
			console.log(
				"magicGLP total value: ",
				`$${magicGlpTotalValueInFloat.toLocaleString()}`,
			);
			console.log(
				"reward total value: ",
				`$${rewardTotalValueInFloat.toLocaleString()}`,
			);
			console.log(`time elapsed since last harvest: ${timeElapsed} seconds`);

			const apyInBips = secondsInOneYear
				.mul(rewardTotalValue)
				.mul(BigNumber.from(BIPS))
				.div(BigNumber.from(timeElapsed))
				.div(magicGlpTotalValue);
			console.log(
				`current apy: ${(apyInBips.toString() as unknown as number) / BIPS}`,
			);
			console.log(`max apy: ${maxApyInBips / BIPS}`);

			if (apyInBips.gt(maxApyInBipsAsBN)) {
				console.log("apy is higher than max, using max apy");

				// calculate how much reward token should represent maxApyInBips
				rewardTokenAmount = maxApyInBipsAsBN
					.mul(BigNumber.from(timeElapsed))
					.mul(magicGlpTotalValue)
					.mul(oneE8)
					.div(BigNumber.from(BIPS))
					.div(secondsInOneYear)
					.div(rewardPrice);
				console.log(
					`adjusted reward token amount: ${(rewardTokenAmount.toString() as unknown as number) / 1e18}`,
				);
			}

			const lens = new Contract(lensAddress, LENS_ABI, provider);
			mintGlpAmount = BigNumber.from(
				(
					await lens.getMintedGlpFromTokenIn(
						rewardToken,
						rewardTokenAmount.toString(),
					)
				)[0],
			);
			console.log(
				"projected glp mint amount",
				(mintGlpAmount.toString() as unknown as number) / 1e18,
			);
			// biome-ignore lint/suspicious/noExplicitAny: untyped
		} catch (err: any) {
			return {
				canExec: false,
				message: `Rpc call failed, details: ${err.toString()}`,
			};
		}

		const minAmountOut = mintGlpAmount.sub(
			mintGlpAmount.mul(mintGlpSlippageInBips).div(BIPS),
		);

		await storage.set("lastTimestamp", timestamp.toString());

		const callData = {
			to: execAddress,
			data: harvester.interface.encodeFunctionData("run", [
				minAmountOut.toString(),
				rewardTokenAmount.toString(),
			]),
		};

		SimulationUrlBuilder.log(
			[GELATO_PROXY[gelatoArgs.chainId]],
			[execAddress],
			[0],
			[callData.data],
			[gelatoArgs.chainId],
		);

		return {
			canExec: true,
			callData: [callData],
		};
	}
	return { canExec: false, message: "Nothing to harvest" };
});
