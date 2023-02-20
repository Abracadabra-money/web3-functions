import { BigNumber, Contract } from "ethers";
import { Interface } from "ethers/lib/utils";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

import ky from "ky";

const LENS_ABI = [
  "function previewAccrue(address) external view returns(uint128)"
]

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, storage, provider } = context;

  const execAddress =
    (userArgs.execAddress as string) ?? "0x762d06bB0E45f5ACaEEA716336142a39376E596E";
  const zeroExApiBaseUrl = userArgs.zeroExApiBaseUrl ?? "https://api.0x.org";
  let intervalInSeconds = (userArgs.intervalInSeconds as number) ?? 86400;
  const strategy =
    (userArgs.strategy as string) ??
    "0xcc0d7aF1f809dD3A589756Bba36Be04D19e9C6c5";
  const rewardSwappingSlippageInBips =
    (userArgs.rewardSwappingSlippageInBips as number) ?? 200;
  const maxBentoBoxAmountIncreaseInBips =
    (userArgs.maxBentoBoxAmountIncreaseInBips as number) ?? 1;
  const maxBentoBoxChangeAmountInBips =
    (userArgs.maxBentoBoxChangeAmountInBips as number) ?? 1000;
  const lens = "0xfd2387105ee3ccb0d96b7de2d86d26344f17787b";

  if (gelatoArgs.chainId == 0) {
    intervalInSeconds = 0;
  }
  
  const BIPS = 10_000;

  // contracts
  const execAbi = ["function lastExecution() external view returns(uint256)"];
  const strategyAbi = [
    "function strategyToken() external view returns(address)",
    "function pendingFeeEarned() external view returns(uint128)"
  ];
  const rewardTokenAbi = [
    "function balanceOf(address) external view returns(uint256)",
  ];

  const execContract = new Contract(execAddress, execAbi, provider);
  const strategyContract = new Contract(strategy, strategyAbi, provider);
  const lensContract = new Contract(lens, LENS_ABI, provider);

  const lastTimestampStr = (await storage.get("lastTimestamp")) ?? "0";
  const lastTimestamp = parseInt(lastTimestampStr);

  // Check if it's ready for a new update
  const timestamp = gelatoArgs.blockTime;
  console.log(`Next update: ${lastTimestamp + intervalInSeconds}`);
  if (timestamp < lastTimestamp + intervalInSeconds) {
    return { canExec: false, message: `Time not elapsed` };
  }

  const strategyToken = await strategyContract.strategyToken();
  if (!strategyToken) throw Error("strategyToken call failed");

  let response = await lensContract.previewAccrue(strategyContract.address);

  if (!response) throw Error(`failed to call previewAccrue`);
  let totalPendingFees = BigNumber.from(response);

  logInfo(`Pending accrued interest: ${totalPendingFees.toString()}`);

  response = await strategyContract.pendingFeeEarned();

  totalPendingFees = totalPendingFees.add(BigNumber.from(response));

  let swapData = new Array<string>(1);
  swapData[0] = "0x0000000000000000000000000000000000000000"

  if (totalPendingFees.gt(BigNumber.from(0))) {
    const quoteApi = `${zeroExApiBaseUrl}/swap/v1/quote?buyToken=0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3&sellToken=${String(strategyToken)}&sellAmount=${totalPendingFees.toString()}`;
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

    console.log(minAmountOut)

    const iface = new Interface([
      "function swapRewards(uint256,address,bytes) external returns (uint256 amountOut)",
    ]);
    swapData[0] = iface.encodeFunctionData("swapRewards", [
      minAmountOut.toString(),
      strategyToken,
      data,
    ]);
  }

  await storage.set("lastTimestamp", timestamp.toString());

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
