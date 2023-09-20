import { Contract, utils } from "ethers";
import { Interface } from "ethers/lib/utils";
import { getProvider } from "../../utils/providers";

import ky from "ky";
import {
  Web3Function,
  Web3FunctionContext,
  Web3FunctionResult
} from "@gelatonetwork/web3-functions-sdk";
import { SimulationUrlBuilder } from "../../utils/tenderly";
import { getSwapInfo } from "../../utils/swap";
import { wrap } from "../../utils/crosschainMulticall";
import { KyInstance } from "ky/distribution/types/ky";
import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { LZ_CHAIN_IDS } from "../../utils/lz";

const strategyAbi = [
  "function swapToLP(uint256,bytes) returns(uint256)",
  "function safeHarvest(uint256,bool,uint256,bool)"
];
const degenBoxAbi = [
  "function totals(address) external view returns (uint128,uint128)",
];

const strategyExecutorAbi = [
  // strategy: (strategy executor address)
  // maxBentoBoxAmountIncreaseInBips (suggested: 1)
  // maxBentoBoxChangeAmountInBips: (suggested: 1000)
  // callee: (list of addresses to call)
  // data: (list of calldata for each address)
  // postRebalanceEnabled: (suggested: true)
  "function run(address,uint256,uint256,address[],bytes[],bool) external",
]

const erc20Abi = [
  "function balanceOf(address) external view returns (uint256)",
];

const BIPS = 10_000;
const minRewardAmount = utils.parseEther("10");

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, storage, multiChainProvider, gelatoArgs } = context;
  const provider = multiChainProvider.default();
  const targetChainId = userArgs.targetChainId as number;

  const intervalInSeconds = userArgs.intervalInSeconds as number;
  const lastTimestampStr = (await storage.get("lastTimestamp")) ?? "0";
  const lastTimestamp = parseInt(lastTimestampStr);

  const targetChainProvider = gelatoArgs.chainId != targetChainId ? await getProvider(context, targetChainId) : provider;

  // Check if it's ready for a new update
  const timestamp = (
    await provider.getBlock("latest")
  ).timestamp;

  console.log(`Next update: ${lastTimestamp + intervalInSeconds}`);
  if (timestamp < lastTimestamp + intervalInSeconds) {
    return { canExec: false, message: "Time not elapsed" };
  }

  const api = ky.extend({
    hooks: {
      beforeRequest: [
        request => {
          // Left here in case openocean ever need an api key
          //request.headers.set('0x-api-key', apiKey);
        }
      ]
    }
  });

  const useCrosschainMulticall = targetChainId != gelatoArgs.chainId;
  let result = await run(api, targetChainProvider, context);

  if (result.canExec) {
    // wrap to l0 bridging if needed
    if (useCrosschainMulticall) {
      result = await wrap(provider, LZ_CHAIN_IDS[targetChainId], result);
    }
    await storage.set("lastTimestamp", timestamp.toString());

    console.log(`cast send --private-key=$PRIVATE_KEY --rpc-url=https://kava-mainnet-archival.gateway.pokt.network/v1/lb/3b9d1dd7 --legacy ${result.callData[0].to} ${result.callData[0].data}`);

  }

  return result;
});

const run = async (api: KyInstance, provider: StaticJsonRpcProvider, context: Web3FunctionContext): Promise<Web3FunctionResult> => {
  const { userArgs, gelatoArgs } = context;
  const execAddress = userArgs.execAddress as string;
  const degenBoxAddress = userArgs.degenBoxAddress as string;
  const lpAddress = userArgs.lpAddress as string;
  const rewardAddress = userArgs.rewardAddress as string;
  const gelatoProxyAddress = userArgs.gelatoProxyAddress as string;
  const swapSlippageBips = userArgs.swapSlippageBips as number;
  const underlyingAddress = userArgs.underlyingAddress as string;

  const strategy = new Contract(execAddress, strategyAbi, provider);
  const box = new Contract(degenBoxAddress, degenBoxAbi, provider);
  const reward = new Contract(rewardAddress, erc20Abi, provider);

  const iface = new Interface(strategyAbi);
  const callData = [];
  const rewardBalance = await reward.balanceOf(execAddress);
  const totalElastic = (await box.callStatic.totals(lpAddress))[0];

  console.log("totalElastic", totalElastic.toString());
  console.log("Reward balance", rewardBalance.toString());

  // dont mint if the stg balance is too low
  if (rewardBalance.gte(minRewardAmount)) {
    const swapInfo = await getSwapInfo(api, rewardAddress, underlyingAddress, gelatoArgs.chainId, execAddress, swapSlippageBips, rewardBalance.toString());
    console.log("swapInfo", JSON.stringify(swapInfo));

    let amountOutMin = await strategy.callStatic.swapToLP(0, swapInfo.data.toString(), {
      from: gelatoProxyAddress,
    });

    if (!amountOutMin) throw Error(`failed to call swapToLP`);
    console.log("amountOutMin", amountOutMin.toString());
    amountOutMin = amountOutMin.mul(BIPS - swapSlippageBips).div(BIPS);
    console.log("amountOutMinWithSlippage", amountOutMin.toString());

    callData.push({
      to: execAddress,
      data: iface.encodeFunctionData("swapToLP", [amountOutMin.toString()])
    });
  } else {
    console.log("Reward balance too low, not minting lp yet");
  }

  callData.push({
    to: execAddress,
    data: iface.encodeFunctionData("safeHarvest", [
      totalElastic.toString(),
      true,
      totalElastic.div(10).toString(),
      false
    ])
  });

  SimulationUrlBuilder.log([gelatoProxyAddress], [callData[0].to], [0], [callData[0].data], [gelatoArgs.chainId]);

  if (callData.length > 1) {
    SimulationUrlBuilder.log([gelatoProxyAddress], [callData[1].to], [0], [callData[1].data], [gelatoArgs.chainId]);
  }

  return { canExec: true, callData };
}