import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract, utils } from "ethers";
import ky from "ky";

const HARVESTER_ABI = [
  "function lastExecution() external view returns(uint256)",
  "function totalRewardsBalanceAfterClaiming() external view returns(uint256)",
  "function run(uint256) external",
];

const TOKEN_ABI = [
  "function balanceOf(address) external view returns(uint256)",
];

const SWAPPER_ABI = ["function swapMimForSpell1Inch(address,bytes) external"];

const getRouterAddress = async (chainId: string): Promise<string> => {
  const routerApi = `https://api.1inch.io/v4.0/${chainId}/approve/spender`;
  const routerApiRes: any = await ky.get(routerApi).json();

  if (!routerApiRes) throw Error("Get router api failed");

  if (!("address" in routerApiRes)) throw Error("get routerApi has no address");

  const routerAddress = routerApiRes.address;

  //logInfo(`routerAddress: ${routerAddress}`);
  return routerAddress;
};

const getQuote = async (
  chainId: string,
  fromTokenAddress: string,
  toTokenAddress: string,
  fromTokenAmount: string
): Promise<BigNumber> => {
  const quoteApi = `https://api.1inch.io/v4.0/${chainId}/quote?fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${fromTokenAmount}`;
  const quoteApiRes: any = await ky.get(quoteApi).json();

  if (!("toTokenAmount" in quoteApiRes))
    throw Error("get quote api has no tokenAmount");

  const toTokenAmount = BigNumber.from(quoteApiRes.toTokenAmount);

  return toTokenAmount;
};

const getSwapData = async (
  chainId: string,
  fromTokenAddress: string,
  toTokenAddress: string,
  fromTokenAmount: string,
  targetAddress: string
): Promise<string> => {
  const slippage = "3";
  const swapApi = `https://api.1inch.io/v4.0/${chainId}/swap?fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${fromTokenAmount}&fromAddress=${targetAddress}&slippage=${slippage}&disableEstimate=true`;

  const swapApiRes: any = await ky.get(swapApi).json();
  if (!swapApiRes) throw Error("Get swap api res failed");

  /*
  { 
    "fromToken": {},
    "toToken": {},
    "toTokenAmount": "17041",
    "fromTokenAmount": "10000000000000",
    "protocols": [],
    "tx": {
      "from": "0xCDf41a135C65d0013393B3793F92b4FAF31032d0",
      "to": "0x1111111254fb6c44bac0bed2854e76f90643097d",
      "data": "0x7c02520000000000000000000000000013927a60c7bf4d3d00e3c1593e0ec713e35d2106000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000001800000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa8417400000000000000000000000034965ba0ac2451a34a0471f04cca3f990b8dea27000000000000000000000000cdf41a135c65d0013393b3793f92b4faf31032d0000000000000000000000000000000000000000000000000000009184e72a00000000000000000000000000000000000000000000000000000000000000041e600000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a4b757fed600000000000000000000000034965ba0ac2451a34a0471f04cca3f990b8dea270000000000000000000000007ceb23fd6bc0add59e62ac25578270cff1b9f6190000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000002dc6c01111111254fb6c44bac0bed2854e76f90643097d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000cfee7c08",
      "value": "0",
      "gas": 235114,
      "gasPrice": "161297033108"
    }
  } */

  if (!("tx" in swapApiRes)) throw Error("No txObj");

  const txObj = swapApiRes.tx;

  if (!("data" in txObj)) throw Error("No swapDataJson");
  const swapData = txObj.data;

  return swapData;
};

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, storage, provider } = context;

  // Retrieve Last oracle update time
  const execAddress =
    (userArgs.execAddress as string) ??
    "0xdFE1a5b757523Ca6F7f049ac02151808E6A52111";
  const chainId = String(gelatoArgs.chainId) ?? "1";
  const fromTokenAddress = "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3";
  const toTokenAddress = "0x090185f2135308BaD17527004364eBcC2D37e5F6";

  const lastTimestampStr = (await storage.get("lastTimestamp")) ?? "0";
  const lastTimestamp = parseInt(lastTimestampStr);

  let fromTokenAmount;
  let mim;

  const timestamp = gelatoArgs.blockTime;

  if (timestamp < lastTimestamp + 3600) {
    // Update storage to persist your current state (values must be cast to string)
    return { canExec: false, message: `wait a bit longer` };
  }

  try {
    mim = new Contract(fromTokenAddress, TOKEN_ABI, provider);
    const fromTokenAmountBN = await mim.balanceOf(execAddress);
    if (fromTokenAmountBN.lt(utils.parseEther("100"))) {
      return { canExec: false, message: `not enough mim` };
    }
    fromTokenAmount =
      fromTokenAmountBN <= utils.parseEther("50000")
        ? fromTokenAmountBN.toString()
        : utils.parseEther("50000").toString();
  } catch (err) {
    return { canExec: false, message: `Rpc call failed` };
  }
  const routerAddress = await getRouterAddress(chainId);

  console.log(routerAddress);

  const toTokenAmount = await getQuote(
    chainId,
    fromTokenAddress,
    toTokenAddress,
    fromTokenAmount
  );
  console.log(utils.formatEther(fromTokenAmount));
  console.log(toTokenAmount.toString());

  if (toTokenAmount.lt(utils.parseEther("100000")))
    return { canExec: false, message: "not enough on contract" };

  const swapData = await getSwapData(
    chainId,
    fromTokenAddress,
    toTokenAddress,
    fromTokenAmount,
    execAddress
  );

  const swapper = new Contract(execAddress, SWAPPER_ABI, provider);

  await storage.set("lastTimestamp", timestamp.toString());

  return {
    canExec: true,
    callData: swapper.interface.encodeFunctionData("swapMimForSpell1Inch", [
      routerAddress,
      swapData,
    ]),
  };
});

function logInfo(msg: string): void {
  console.info(msg);
}
