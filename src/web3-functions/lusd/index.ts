import { BigNumber, Contract } from "ethers";
import { Interface } from "ethers/lib/utils";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

import ky from "ky";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;

  const execAddress = userArgs.execAddress as string ?? "0x762d06bB0E45f5ACaEEA716336142a39376E596E";
  const zeroExApiBaseUrl = userArgs.zeroExApiBaseUrl ?? "https://api.0x.org";
  let intervalInSeconds = userArgs.intervalInSeconds ?? 86400;
  const strategy = userArgs.strategy as string ?? "0x1EdC13C5FC1C6e0731AE4fC1Bc4Cd6570bBc755C";
  const rewardSwappingSlippageInBips =
    userArgs.rewardSwappingSlippageInBips as string ?? 200;
  const maxBentoBoxAmountIncreaseInBips =
    userArgs.maxBentoBoxAmountIncreaseInBips ?? 1;
  const maxBentoBoxChangeAmountInBips = userArgs.maxBentoBoxChangeAmountInBips ?? 1000;

  if (gelatoArgs.chainId == 0) {
    intervalInSeconds = 0;
  }

  if (!userArgs.rewardTokensCommaSeparated) {
    userArgs.rewardTokensCommaSeparated = "ETH,0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D";
  }

  const rewardTokens = (userArgs.rewardTokensCommaSeparated as string).split(
    ","
  );

  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const stabilityPool = "0x66017D22b0f8556afDd19FC67041899Eb65a21bb";
  const BIPS = 10_000;

  // contracts
  const execAbi = ["function lastExecution() external view returns(uint256)"];
  const strategyAbi = ["function strategyToken() external view returns(address)"];
  const stabilityPoolAbi = [
    "function getDepositorETHGain(address) external view returns(uint256)",
    "function getDepositorLQTYGain(address) external view returns(uint256)",
  ];

  const rewardTokenAbi = [
    "function balanceOf(address) external view returns(uint256)",
  ];

  const execContract = new Contract(execAddress, execAbi, provider);
  const strategyContract = new Contract(strategy, strategyAbi, provider);
  const stabilityPoolContract = new Contract(
    stabilityPool,
    stabilityPoolAbi,
    provider
  );

  let swapData = new Array<string>(rewardTokens.length);
  for (let i = 0; i < rewardTokens.length; i++) {
    rewardTokens[i] = rewardTokens[i].trim();
    swapData[i] = "";
  }

  let lastUpdated;

  try {
    lastUpdated = parseInt(await execContract.lastExecution());
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

  for (let i = 0; i < rewardTokens.length; i++) {
    let rewardToken = rewardTokens[i];
    let sellToken = rewardToken;
    let rewardTokenBalance: BigNumber;

    // Native ETH reward
    if (rewardToken == "ETH" || rewardToken == zeroAddress) {
      rewardToken = zeroAddress;
      sellToken = "ETH";
      rewardTokenBalance = await provider.getBalance(strategy);

      if (!rewardTokenBalance) throw Error(`ETH getBalance failed`);

      logInfo(`current ETH balance: ${rewardTokenBalance}`);

      const toHarvestAmount = await stabilityPoolContract.getDepositorETHGain(
        strategy
      );

      if (!toHarvestAmount) throw Error(`getDepositorETHGain failed`);

      logInfo(`ETH toHarvest: ${toHarvestAmount}`);

      rewardTokenBalance = rewardTokenBalance.add(toHarvestAmount);
    } else {
      const rewardTokenContract = new Contract(
        rewardToken,
        rewardTokenAbi,
        provider
      );

      const response = await rewardTokenContract.balanceOf(strategy);

      if (!response) throw Error(`failed to obtain ${rewardToken} balance`);

      logInfo(`current LQTY balance: ${response}`);
      rewardTokenBalance = response;

      const toHarvestAmount = await stabilityPoolContract.getDepositorLQTYGain(
        strategy
      );

      logInfo(`LQTY toHarvest: ${toHarvestAmount}`);

      if (!toHarvestAmount) throw Error(`getDepositorLQTYGain failed`);

      rewardTokenBalance = rewardTokenBalance.add(toHarvestAmount);
    }

    if (rewardTokenBalance.gt(0)) {
      const quoteApi = `${zeroExApiBaseUrl}/swap/v1/quote?buyToken=${strategyToken}&sellToken=${sellToken}&sellAmount=${rewardTokenBalance.toString()}`;
      logInfo(quoteApi);
      const quoteApiRes: any = await ky.get(quoteApi).json();

      if (!quoteApiRes) throw Error("Get quote api failed");
      const quoteResObj = quoteApiRes;

      let value = quoteResObj.buyAmount;
      if (!value) throw Error("No buyAmount");
      const toTokenAmount = BigNumber.from(value);

      value = quoteResObj.data;
      if (!value) throw Error("No data");
      const data = value.toString();

      const minAmountOut = toTokenAmount.sub(
        toTokenAmount.mul(rewardSwappingSlippageInBips).div(BIPS)
      );
      const iface = new Interface([
        "function swapRewards(uint256,address,bytes) external returns (uint256 amountOut)",
      ]);
      swapData[i] = iface.encodeFunctionData("swapRewards", [
        minAmountOut.toString(),
        rewardToken,
        data,
      ]);
    }
  }

  swapData = swapData.filter((f) => f != "");

  const iface = new Interface([
    "function run(address,uint256,uint256,bytes[]) external",
  ]);
  const callData = iface.encodeFunctionData("run", [
    strategy,
    maxBentoBoxAmountIncreaseInBips.toString(),
    maxBentoBoxChangeAmountInBips.toString(),
    swapData.length > 0 ? swapData : "[]", //'["' + swapData.join('", "') + '"]' : "[]",
  ]);

  return { canExec: false, callData, message: "" };
});

function logInfo(msg: string): void {
  console.info(msg);
}