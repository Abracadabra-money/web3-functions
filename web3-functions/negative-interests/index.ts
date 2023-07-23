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
  const { userArgs, storage, multiChainProvider } = context;
  const provider = multiChainProvider.default();

  const zeroExApiBaseUrl = userArgs.zeroExApiBaseUrl as string;
  let intervalInSeconds = userArgs.intervalInSeconds as number;

  // WBTC strat: 0x186d76147A226A51a112Bb1958e8b755ab9FD1aF
  // WETH strat: 0xcc0d7aF1f809dD3A589756Bba36Be04D19e9C6c5
  const strategy = userArgs.strategy as string;
  const execAddress = userArgs.execAddress as string;
  const rewardSwappingSlippageInBips = userArgs.rewardSwappingSlippageInBips as number;
  const maxBentoBoxAmountIncreaseInBips = userArgs.maxBentoBoxAmountIncreaseInBips as number;
  const maxBentoBoxChangeAmountInBips = userArgs.maxBentoBoxChangeAmountInBips as number;
  const lens = "0xfd2387105ee3ccb0d96b7de2d86d26344f17787b";

  const BIPS = 10_000;

  // contracts
  const strategyAbi = [
    "function strategyToken() external view returns(address)",
    "function pendingFeeEarned() external view returns(uint128)"
  ];

  const mim = "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3";
  const strategyContract = new Contract(strategy, strategyAbi, provider);
  const lensContract = new Contract(lens, LENS_ABI, provider);

  const lastTimestampStr = (await storage.get("lastTimestamp")) ?? "0";
  const lastTimestamp = parseInt(lastTimestampStr);

  // Check if it's ready for a new update
  const timestamp = (
    await multiChainProvider.chainId(1).getBlock("latest")
  ).timestamp;

  console.log(`Next update: ${lastTimestamp + intervalInSeconds}`);
  if (timestamp < lastTimestamp + intervalInSeconds) {
    return { canExec: false, message: "Time not elapsed" };
  }

  const strategyToken = await strategyContract.strategyToken();
  if (!strategyToken) throw Error("strategyToken call failed");

  let response = await lensContract.previewAccrue(strategyContract.address);

  if (!response) throw Error(`failed to call previewAccrue`);
  let totalPendingFees = BigNumber.from(response);

  logInfo(`Pending accrued interest: ${totalPendingFees.toString()}`);

  response = await strategyContract.pendingFeeEarned();

  totalPendingFees = totalPendingFees.add(BigNumber.from(response));

  const swapData = new Array<string>(1);
  swapData[0] = "0x0000000000000000000000000000000000000000"

  const apiKey = await context.secrets.get("ZEROX_API_KEY");
  if (!apiKey) {
    return { canExec: false, message: "ZEROX_API_KEY not set in secrets" };
  }

  const api = ky.extend({
    hooks: {
      beforeRequest: [
        request => {
          request.headers.set('0x-api-key', apiKey);
        }
      ]
    }
  });

  if (totalPendingFees.gt(BigNumber.from(0))) {
    const quoteApi = `${zeroExApiBaseUrl}/swap/v1/quote?buyToken=${mim}&sellToken=${String(strategyToken)}&sellAmount=${totalPendingFees.toString()}`;
    const quoteApiRes: any = await api.get(quoteApi).json();

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
      "function swapAndwithdrawFees(uint256,address,bytes) external returns (uint256 amountOut)",
    ]);
    swapData[0] = iface.encodeFunctionData("swapAndwithdrawFees", [
      minAmountOut.toString(),
      mim,
      data,
    ]);
  }

  await storage.set("lastTimestamp", timestamp.toString());

  const iface = new Interface([
    "function run(address,uint256,uint256,bytes[]) external",
  ]);
  const callData = {
    to: execAddress,
    data: iface.encodeFunctionData("run", [
      strategy,
      maxBentoBoxAmountIncreaseInBips.toString(),
      maxBentoBoxChangeAmountInBips.toString(),
      swapData.length > 0 ? swapData : "[]",
    ])
  };

  console.log(
    `https://dashboard.tenderly.co/abracadabra/magic-internet-money/simulator/new?contractFunction=0xe766b1f5&value=0&contractAddress=${callData.to}&rawFunctionInput=${callData.data}&network=1&from=0x4d0c7842cd6a04f8edb39883db7817160da159c3&block=&blockIndex=0&headerBlockNumber=&headerTimestamp=`
  );
  //console.log(callData);

  return { canExec: true, callData: [callData] };
});

function logInfo(msg: string): void {
  console.info(msg);
}
