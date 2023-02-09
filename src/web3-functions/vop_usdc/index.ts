import { BigNumber, Contract } from "ethers";
import { Interface } from "ethers/lib/utils";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";


Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;

  const execAddress = userArgs.execAddress as string ?? "0x7E05363E225c1c8096b1cd233B59457104B84908";
  let intervalInSeconds = userArgs.intervalInSeconds as number ?? 43200;
  const wrapper = userArgs.wrapper as string ?? "0x6eb1709e0b562097bf1cc48bc6a378446c297c04";

  const pair = userArgs.pair as string ?? "0x47029bc8f5cbe3b464004e87ef9c9419a48018cd";
  const router = userArgs.router as string ?? "0xa132DAB612dB5cB9fC9Ac426A0Cc215A3423F9c9";
  const factory = userArgs.factory as string ?? "0x25CbdDb98b35ab1FF77413456B31EC81A6B6B746";
  const wrapperRewardQuoteSlippageBips =
    userArgs.wrapperRewardQuoteSlippageBips as number ?? 100;
  const strategyRewardQuoteSlippageBips =
    userArgs.strategyRewardQuoteSlippageBips as number ?? 100;

  const strategy = userArgs.strategy as string ?? "0xa3372cd2178c52fdcb1f6e4c4e93014b4db3b20d";
  const strategyLens = userArgs.strategyLens as string ?? "0x8BEE5Db2315Df7868295c531B36BaA53439cf528";
  const maxBentoBoxAmountIncreaseInBips =
    userArgs.maxBentoBoxAmountIncreaseInBips as number ?? 1;
  const maxBentoBoxChangeAmountInBips =
    userArgs.maxBentoBoxChangeAmountInBips as number ?? 1000;

  if (gelatoArgs.chainId == 0) {
    intervalInSeconds = 0;
  }

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
    provider
  );

  const execContract = new Contract(execAddress, execAbi, provider);
  const strategyContract = new Contract(strategy, strategyAbi, provider);
  const factoryContract = new Contract(factory, factoryAbi, provider);

  let lastUpdated;

  try {
    lastUpdated = parseInt(await execContract.lastExecution(strategy));
    console.log(`Last harvester update: ${lastUpdated}`);
  } catch (err) {
    console.error(err);
    return { canExec: false, message: `Rpc call failed` };
  }

  // Check if it's ready for a new update
  const timestamp = gelatoArgs.blockTime;
  console.log(`Next update: ${lastUpdated + intervalInSeconds}`);
  if (timestamp < lastUpdated + intervalInSeconds) {
    return { canExec: false, message: `Time not elapsed` };
  }

  const strategyToken = await strategyContract.strategyToken();
  if (!strategyToken) throw Error("strategyToken call failed");

  let fee = BigNumber.from(3);

  if (factory) {
    const request = await factoryContract.volatileFee();
    if (!request) throw Error("volatileFee call failed");
    fee = request;
  }

  let request;
  try {
    request =
      (await strategyLensContract.quoteSolidlyWrapperHarvestAmountOut(
        wrapper,
        router,
        fee
      )).toString();
  } catch (error) {
    request = "0"
  }

  if (!request)
    throw Error("quoteSolidlyWrapperHarvestAmountOut call failed");

  let minLpOutFromWrapperRewards = BigNumber.from(request);
  if (minLpOutFromWrapperRewards.gt(0)) {
    minLpOutFromWrapperRewards = minLpOutFromWrapperRewards.sub(
      minLpOutFromWrapperRewards
        .mul(wrapperRewardQuoteSlippageBips)
        .div(10_000)
    );

    callee[0] = wrapper;
    const iface = new Interface([
      "function harvest(uint256) external returns (uint256)",
    ]);
    data[0] = iface.encodeFunctionData("harvest", [
      minLpOutFromWrapperRewards,
    ]);
    logInfo(
      `minLpOutFromWrapperRewards: ${minLpOutFromWrapperRewards.toString()}`
    );
  }
  try {
    request =
      (await strategyLensContract.quoteSolidlyGaugeVolatileStrategySwapToLPAmount(
        strategy,
        pair,
        router,
        fee
      )).toString();
  } catch (error) {
    request = "0";
  }

  if (!request)
    throw Error(
      "quoteSolidlyGaugeVolatileStrategySwapToLPAmount call failed"
    );

  let minLpOutFromStrategyRewards = BigNumber.from(request);

  if (minLpOutFromStrategyRewards.gt(0)) {
    minLpOutFromStrategyRewards = minLpOutFromStrategyRewards.sub(
      minLpOutFromStrategyRewards
        .mul(strategyRewardQuoteSlippageBips)
        .div(10_000)
    );

    callee[1] = strategy;
    const iface = new Interface([
      "function swapToLP(uint256,uint256) external returns (uint256)",
    ]);
    data[1] = iface.encodeFunctionData("swapToLP", [
      minLpOutFromWrapperRewards,
      fee,
    ]);

    logInfo(
      `minLpOutFromStrategyRewards: ${minLpOutFromStrategyRewards.toString()}`
    );
  }

  data = data.filter((f) => f != "");
  callee = callee.filter((f) => f != "");

  if (data.length > 0) {
    const iface = new Interface([
      "function run(address,uint256,uint256,address[],bytes[],bool) external",
    ]);
    const callData = iface.encodeFunctionData("run", [
      strategy,
      maxBentoBoxAmountIncreaseInBips,
      maxBentoBoxChangeAmountInBips,
      callee.length > 0 ? callee : "[]", //'["' + callee.join('", "') + '"]' : "[]",
      data.length > 0 ? data : "[]", //'["' + data.join('", "') + '"]' : "[]",
      true,
    ]);

    return { canExec: false, callData, message: "Ready to execute" };
  }

  return { canExec: false, message: "Cannot execute" };
}
);

function logInfo(msg: string): void {
  console.info(msg);
}