import {
	Web3Function,
	type Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";
import { Interface } from "ethers/lib/utils";
import { SimulationUrlBuilder } from "../../utils/tenderly";

const GELATO_PROXY = "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3";

Web3Function.onRun(async (context: Web3FunctionContext) => {
	const { userArgs, storage, gelatoArgs, multiChainProvider } = context;
	const provider = multiChainProvider.default();

	const execAddress = userArgs.execAddress as string;
	const intervalInSeconds = userArgs.intervalInSeconds as number;
	const wrapper = userArgs.wrapper as string;
	const pair = userArgs.pair as string;
	const router = userArgs.router as string;
	const factory = userArgs.factory as string;
	const wrapperRewardQuoteSlippageBips =
		userArgs.wrapperRewardQuoteSlippageBips as number;
	const strategyRewardQuoteSlippageBips =
		userArgs.strategyRewardQuoteSlippageBips as number;

	const strategy = userArgs.strategy as string;
	const strategyLens = userArgs.strategyLens as string;
	const maxBentoBoxAmountIncreaseInBips =
		userArgs.maxBentoBoxAmountIncreaseInBips as number;
	const maxBentoBoxChangeAmountInBips =
		userArgs.maxBentoBoxChangeAmountInBips as number;

	let callee = new Array<string>(2);
	let data = new Array<string>(2);
	for (let i = 0; i < data.length; i++) {
		data[i] = "";
		callee[i] = "";
	}

	// contracts
	const execAbi = [
		"function lastExecution(address) external view returns(uint256)",
	];
	const strategyAbi = [
		"function strategyToken() external view returns(address)",
	];
	const factoryAbi = ["function volatileFee() external view returns(uint256)"];
	const strategyLensAbi = [
		"function quoteSolidlyWrapperHarvestAmountOut(address,address,uint256) external view returns(uint256)",

		"function quoteSolidlyGaugeVolatileStrategySwapToLPAmount(address,address,address,uint256) external view returns(uint256)",
	];

	const strategyLensContract = new Contract(
		strategyLens,
		strategyLensAbi,
		provider,
	);

	const execContract = new Contract(execAddress, execAbi, provider);
	const strategyContract = new Contract(strategy, strategyAbi, provider);
	const factoryContract = new Contract(factory, factoryAbi, provider);

	const lastTimestampStr = (await storage.get("lastTimestamp")) ?? "0";
	const lastTimestamp = Number.parseInt(lastTimestampStr);

	// Check if it's ready for a new update
	const timestamp = (await provider.getBlock("latest")).timestamp;

	console.log(`Next update: ${lastTimestamp + intervalInSeconds}`);
	if (timestamp < lastTimestamp + intervalInSeconds) {
		return { canExec: false, message: "Time not elapsed" };
	}

	const strategyToken = await strategyContract.strategyToken();
	if (!strategyToken) throw Error("strategyToken call failed");

	let fee = BigNumber.from(3);

	if (factory) {
		const request = await factoryContract.volatileFee();
		if (!request) throw Error("volatileFee call failed");
		fee = request;
	}

	let request: BigNumber | string;
	try {
		request = (
			await strategyLensContract.quoteSolidlyWrapperHarvestAmountOut(
				wrapper,
				router,
				fee,
			)
		).toString();
	} catch (error) {
		request = "0";
	}

	if (!request) throw Error("quoteSolidlyWrapperHarvestAmountOut call failed");

	let minLpOutFromWrapperRewards = BigNumber.from(request);
	if (minLpOutFromWrapperRewards.gt(0)) {
		minLpOutFromWrapperRewards = minLpOutFromWrapperRewards.sub(
			minLpOutFromWrapperRewards
				.mul(wrapperRewardQuoteSlippageBips)
				.div(10_000),
		);

		callee[0] = wrapper;
		const iface = new Interface([
			"function harvest(uint256) external returns (uint256)",
		]);
		data[0] = iface.encodeFunctionData("harvest", [minLpOutFromWrapperRewards]);
		console.info(
			`minLpOutFromWrapperRewards: ${minLpOutFromWrapperRewards.toString()}`,
		);
	}
	try {
		request = (
			await strategyLensContract.quoteSolidlyGaugeVolatileStrategySwapToLPAmount(
				strategy,
				pair,
				router,
				fee,
			)
		).toString();
	} catch (error) {
		request = "0";
	}

	if (!request)
		throw Error("quoteSolidlyGaugeVolatileStrategySwapToLPAmount call failed");

	let minLpOutFromStrategyRewards = BigNumber.from(request);

	if (minLpOutFromStrategyRewards.gt(0)) {
		minLpOutFromStrategyRewards = minLpOutFromStrategyRewards.sub(
			minLpOutFromStrategyRewards
				.mul(strategyRewardQuoteSlippageBips)
				.div(10_000),
		);

		callee[1] = strategy;
		const iface = new Interface([
			"function swapToLP(uint256,uint256) external returns (uint256)",
		]);
		data[1] = iface.encodeFunctionData("swapToLP", [
			minLpOutFromWrapperRewards,
			fee,
		]);

		console.info(
			`minLpOutFromStrategyRewards: ${minLpOutFromStrategyRewards.toString()}`,
		);
	}

	data = data.filter((f) => f !== "");
	callee = callee.filter((f) => f !== "");

	if (data.length > 0) {
		const iface = new Interface([
			"function run(address,uint256,uint256,address[],bytes[],bool) external",
		]);
		const callData = {
			to: execAddress,
			data: iface.encodeFunctionData("run", [
				strategy,
				maxBentoBoxAmountIncreaseInBips,
				maxBentoBoxChangeAmountInBips,
				callee.length > 0 ? callee : "[]", //'["' + callee.join('", "') + '"]' : "[]",
				data.length > 0 ? data : "[]", //'["' + data.join('", "') + '"]' : "[]",
				true,
			]),
		};

		SimulationUrlBuilder.log(
			[GELATO_PROXY],
			[callData.to],
			[0],
			[callData.data],
			[gelatoArgs.chainId],
		);

		await storage.set("lastTimestamp", timestamp.toString());

		return { canExec: true, callData: [callData], message: "Ready to execute" };
	}

	return { canExec: false, message: "Cannot execute" };
});
