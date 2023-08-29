import { BigNumber, Contract } from "ethers";
import { Interface } from "ethers/lib/utils";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { SimulationUrlBuilder } from "../../utils/tenderly";

const BIPS = 10_000;

// using create3, same address on all chains
const XF33D_ORACLE_ADDRESS = "0x518d6B079884Ca6Ff12c398F68Ac31516813b1A5";
const GELATO_PROXY = "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3";

const XF33D_ORACLE_ABI = [
  "function getFeesForFeedUpdate(uint16,address) external view returns (uint256)",
  "function sendUpdatedRate(uint16,address) external payable",
]

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, storage, gelatoArgs, multiChainProvider } = context;
  const provider = multiChainProvider.default();
  const intervalInSeconds = userArgs.intervalInSeconds as number;
  const destinationChain = BigNumber.from(userArgs.destinationChain as number);
  const chainlinkOracle = userArgs.chainlinkOracle as string;

  const feed = new Contract(XF33D_ORACLE_ADDRESS, XF33D_ORACLE_ABI, provider);

  const lastTimestampStr = (await storage.get("lastTimestamp")) ?? "0";
  const lastTimestamp = parseInt(lastTimestampStr);

  // Check if it's ready for a new update
  const timestamp = (
    await provider.getBlock("latest")
  ).timestamp;

  console.log(`Next update: ${lastTimestamp + intervalInSeconds}`);
  if (timestamp < lastTimestamp + intervalInSeconds) {
    return { canExec: false, message: "Time not elapsed" };
  }

  const iface = new Interface(XF33D_ORACLE_ABI);
  const callData = [];

  const fees = await feed.getFeesForFeedUpdate(destinationChain, chainlinkOracle);
  callData.push({
    to: XF33D_ORACLE_ADDRESS,
    data: iface.encodeFunctionData("sendUpdatedRate", [
      destinationChain,
      chainlinkOracle
    ]),
    value: fees.toString()
  });

  SimulationUrlBuilder.log([GELATO_PROXY], [callData[0].to], [callData[0].value], [callData[0].data], [gelatoArgs.chainId]);

  await storage.set("lastTimestamp", timestamp.toString());

  return { canExec: true, callData };
});

