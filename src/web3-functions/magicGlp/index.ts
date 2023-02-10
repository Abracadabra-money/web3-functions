import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";

const HARVESTER_ABI = [
  "function lastExecution() external view returns(uint256)",
  "function totalRewardsBalanceAfterClaiming() external view returns(uint256)",
  "function run(uint256) external",
];

const LENS_ABI = [
  "function glpMintAmount(address,uint256) external view returns(uint256)",
];

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;

  // Retrieve Last oracle update time
  const execAddress =
    (userArgs.execAddress as string) ??
    "0x588d402C868aDD9053f8F0098c2DC3443c991d17";
  let intervalInSeconds = userArgs.intervalInSeconds ?? 46200;
  const lensAddress =
    (userArgs.lensAddress as string) ??
    "0x66499d9Faf67Dc1AC1B814E310e8ca97f1bc1f1a";
  const rewardToken =
    (userArgs.rewardToken as string) ??
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const mintGlpSlippageInBips =
    (userArgs.mintGlpSlippageInBips as number) ?? 100;

  if (gelatoArgs.chainId == 0) {
    intervalInSeconds = 0;
  }

  const BIPS = 10_000;

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
  console.log(`Next oracle update: ${lastUpdated + intervalInSeconds}`);
  if (timestamp < lastUpdated + intervalInSeconds) {
    return { canExec: false, message: `Time not elapsed` };
  }

  let rewardTokenBalance;
  let lens;
  try {
    rewardTokenBalance = BigNumber.from(
      await harvester.totalRewardsBalanceAfterClaiming()
    );
    console.log(`Last harvester update: ${lastUpdated}`);
  } catch (err) {
    return { canExec: false, message: `Rpc call failed` };
  }

  if (rewardTokenBalance.gt(0)) {
    let mintGlpAmount;
    try {
      lens = new Contract(lensAddress, LENS_ABI, provider);
      mintGlpAmount = BigNumber.from(
        await lens.glpMintAmount(rewardToken, rewardTokenBalance.toString())
      );
    } catch (err) {
      return { canExec: false, message: `Rpc call failed` };
    }

    const minAmountOut = mintGlpAmount.sub(
      mintGlpAmount.mul(mintGlpSlippageInBips).div(BIPS)
    );

    return {
      canExec: true,
      callData: harvester.interface.encodeFunctionData("run", [
        minAmountOut.toString(),
      ]),
    };
  }
  return { canExec: false, message: "Nothing to harvest" };
});
