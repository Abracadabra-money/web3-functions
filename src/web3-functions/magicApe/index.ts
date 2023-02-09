import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";

const HARVESTER_ABI = [
  "function lastExecution() external view returns(uint256)",
  "function claimable() external view returns(uint256)",
  "function run() external"
];


Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;

  // Retrieve Last oracle update time
  const execAddress = (userArgs.execAddress as string) ?? "0x5226d847cAdABB7FcBd6c2a8568C58a6e10465bf";
  let intervalInSeconds = userArgs.intervalInSeconds ?? 86400;

  if (gelatoArgs.chainId == 0) {
    intervalInSeconds = 0;
  }

  let lastUpdated;
  let harvester;

  try {
    harvester = new Contract(execAddress, HARVESTER_ABI, provider);
    lastUpdated = parseInt(await harvester.lastExecution());
    console.log(`Last harvester update: ${lastUpdated}`);
  } catch (err) {
    return { canExec: false, message: `Rpc call failed` };
  }

  // Check if it's ready for a new update
  const timestamp = gelatoArgs.blockTime;
  console.log(`Next update: ${lastUpdated + intervalInSeconds}`);
  if (timestamp < lastUpdated + intervalInSeconds) {
    return { canExec: false, message: `Time not elapsed` };
  }

  let rewardTokenBalance;

  try {
    rewardTokenBalance = BigNumber.from(await harvester.claimable());
    console.log(`Last harvester update: ${lastUpdated}`);
  } catch (err) {
    return { canExec: false, message: `Rpc call failed` };
  }

  if (rewardTokenBalance.gt(0)) {
    return { canExec: true, callData: harvester.interface.encodeFunctionData("run", []) };
  }
  return { canExec: false, message: "Nothing to harvest" };
});
