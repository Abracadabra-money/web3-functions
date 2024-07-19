import {
	Web3Function,
	type Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";

import { SimulationUrlBuilder } from "../../utils/tenderly";

const GELATO_PROXY = "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3";

const HARVESTER_ABI = [
	"function lastExecution() external view returns(uint256)",
	"function claimable() external view returns(uint256)",
	"function run() external",
];

Web3Function.onRun(async (context: Web3FunctionContext) => {
	const { userArgs, storage, gelatoArgs, multiChainProvider } = context;
	const provider = multiChainProvider.default();

	// Retrieve Last oracle update time
	const execAddress = userArgs.execAddress as string;
	const intervalInSeconds = userArgs.intervalInSeconds as number;
	const harvester = new Contract(execAddress, HARVESTER_ABI, provider);

	const lastTimestampStr = (await storage.get("lastTimestamp")) ?? "0";
	const lastTimestamp = Number.parseInt(lastTimestampStr);

	// Check if it's ready for a new update
	const timestamp = (await provider.getBlock("latest")).timestamp;

	console.log(`Next update: ${lastTimestamp + intervalInSeconds}`);
	if (timestamp < lastTimestamp + intervalInSeconds) {
		return { canExec: false, message: "Time not elapsed" };
	}

	let rewardTokenBalance: BigNumber;

	try {
		rewardTokenBalance = BigNumber.from(await harvester.claimable());
	} catch (err) {
		return { canExec: false, message: "Rpc call failed" };
	}

	if (rewardTokenBalance.gt(0)) {
		await storage.set("lastTimestamp", timestamp.toString());

		const callData = {
			to: execAddress,
			data: harvester.interface.encodeFunctionData("run", []),
		};

		SimulationUrlBuilder.log(
			[GELATO_PROXY],
			[callData.to],
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
