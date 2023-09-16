import { Contract, utils } from "ethers";
import { Interface } from "ethers/lib/utils";
import ky from "ky";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { SimulationUrlBuilder } from "../../utils/tenderly";
import { getSwapInfo } from "../../utils/swap";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, storage, gelatoArgs, multiChainProvider } = context;
  const provider = multiChainProvider.default();
  const intervalInSeconds = userArgs.intervalInSeconds as number;
  const execAddress = userArgs.execAddress as string;
  const degenBoxAddress = userArgs.degenBoxAddress as string;
  const lpAddress = userArgs.lpAddress as string;
  const rewardAddress = userArgs.rewardAddress as string;
  const gelatoProxyAddress = userArgs.gelatoProxyAddress as string;
  const swapToLpSlippageBips = userArgs.swapToLpSlippageBips as number;
  const underlyingAddress = userArgs.underlyingAddress as string;

  const BIPS = 10_000;

  // contracts
  const strategyAbi = [
    "function swapToLP(uint256,bytes) returns(uint256)",
    "function safeHarvest(uint256,bool,uint256,bool)"
  ];

  const degenBoxAbi = [
    "function totals(address) external view returns (uint128,uint128)",
  ];

  const erc20Abi = [
    "function balanceOf(address) external view returns (uint256)",
  ];

  const strategy = new Contract(execAddress, strategyAbi, provider);
  const box = new Contract(degenBoxAddress, degenBoxAbi, provider);
  const reward = new Contract(rewardAddress, erc20Abi, provider);

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

  const iface = new Interface(strategyAbi);
  const callData = [];
  const rewardBalance = await reward.balanceOf(execAddress);
  const totalElastic = (await box.callStatic.totals(lpAddress))[0];

  console.log("totalElastic", totalElastic.toString());
  console.log("Reward balance", rewardBalance.toString());

  // dont mint if the stg balance is too low
  if (rewardBalance.gt(utils.parseEther("10"))) {
    const swapInfo = await getSwapInfo(api, rewardAddress, underlyingAddress, gelatoArgs.chainId, execAddress, swapToLpSlippageBips, rewardBalance.toString());
    console.log("swapInfo", JSON.stringify(swapInfo));

    let amountOutMin = await strategy.callStatic.swapToLP(0, swapInfo.data.toString(), {
      from: gelatoProxyAddress,
    });

    if (!amountOutMin) throw Error(`failed to call swapToLP`);
    console.log("amountOutMin", amountOutMin.toString());
    amountOutMin = amountOutMin.mul(BIPS - swapToLpSlippageBips).div(BIPS);
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

  await storage.set("lastTimestamp", timestamp.toString());

  return { canExec: true, callData };
});

