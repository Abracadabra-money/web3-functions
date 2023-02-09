import { BigNumber, Contract, ethers, providers } from "ethers";
import { Interface } from "ethers/lib/utils";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

import ky from "ky";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider} = context;
  const timeNowSec = gelatoArgs.blockTime

  const execAddress = (userArgs.execAddress as string) ?? "0xf9cE23237B25E81963b500781FA15d6D38A0DE62";
  let intervalInSeconds = userArgs.intervalInSeconds ?? 86400; // 1h
  const zeroExApiBaseUrl = userArgs.zeroExApiBaseUrl ?? "https://arbitrum.api.0x.org";
  const rewardSwappingSlippageInBips = userArgs.rewardSwappingSlippageInBips ?? 100;

  if (gelatoArgs.chainId == 0) {
    intervalInSeconds = 0;
  }
  
  const timeNowSecBig = BigNumber.from(+timeNowSec.toFixed(0));

  const BIPS = 10_000;

  const abi = ["function lastExecution() external view returns(uint256)",
    "function rewardToken() external view returns(address)",
    "function outputToken() external view returns(address)",
    "function totalRewardsBalanceAfterClaiming() external view returns(uint256)"
  ]
  const contract = new Contract(execAddress, abi, provider);


  const lastExecuted = await contract.lastExecution();

  if (timeNowSecBig.lt(lastExecuted.add(intervalInSeconds))) {
    return { canExec: false, message: "" };
  }

  const rewardToken = await contract.rewardToken();

  if (!rewardToken) throw Error("rewardToken call failed");

  const outputToken = await contract.outputToken()

  if (!outputToken) throw Error("outputToken call failed");

  const rewardTokenBalanceResponse = await contract.totalRewardsBalanceAfterClaiming();

  if (!rewardTokenBalanceResponse)
    throw Error(`failed to obtain ${rewardToken} balance after claiming`);

  const rewardTokenBalance = rewardTokenBalanceResponse;

  if (rewardTokenBalance.gt(0)) {
    const quoteApi = `${zeroExApiBaseUrl}/swap/v1/quote?buyToken=${outputToken}&sellToken=${rewardToken}&sellAmount=${rewardTokenBalance.toString()}`;
    logInfo(quoteApi);

    const quoteApiRes: any = await ky
      .get(
        quoteApi
      )
      .json();

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

    const iface = new Interface(["function run(uint256,bytes) external"])
    const callData = iface.encodeFunctionData("run", [minAmountOut.toString(), data])

    return { canExec: true, callData };
  }

  return { canExec: false, message: '' };

})

function logInfo(msg: string): void {
  console.info(msg);
}