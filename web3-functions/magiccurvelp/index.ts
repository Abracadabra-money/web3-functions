import { Contract, utils, BigNumber, constants } from "ethers";
import ky from "ky";
import { Interface } from "ethers/lib/utils";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

//import { SimulationUrlBuilder } from "../../utils/tenderly";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, storage, gelatoArgs, multiChainProvider } = context;
  const provider = multiChainProvider.default();
  const intervalInSeconds = userArgs.intervalInSeconds as number;
  const execAddress = userArgs.execAddress as string;
  const vaultAddress = userArgs.vaultAddress as string;
  const curveLensAddress = userArgs.curveLensAddress as string;
  const minRequiredLpAmount = userArgs.minRequiredLpAmount as number;
  const swapRewardToTokenAddress = userArgs.swapRewardToTokenAddress as string;
  const swapRewardsSlippageBips = userArgs.swapRewardsSlippageBips as number;

  const vaultAbi = [
    "function staking() external view returns(address)",
    "function asset() external view returns(address)",
  ];

  const curveLensAbi = [
    "function calc_token_amount(address,address,uint256[5],uint256,bool,bool) view returns (uint256)"
  ]

  const harvestorAbi = [
    "function poolNumCoins() external view returns(uint8)",
    "function poolTokenInIndex() external view returns(uint8)",
    "function rewardToken() external view returns(address)",
    "function run(uint256, address, uint256, bytes memory) external",
    "function totalRewardsBalanceAfterClaiming() external view returns (uint256)"
  ];

  const erc20Abi = [
    "function balanceOf(address) external view returns (uint256)",
  ];

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

  const getSwapInfo = async (amount: string): Promise<{ data: string, minOutAmount: string }> => {
    switch (gelatoArgs.chainId) {
      // KAVA, use openocean aggregator
      case 2222:
        let url = 'https://ethapi.openocean.finance/v2/2222/gas-price';
        let response: any = await api
          .get(url, { timeout: 10_000, retry: 0 })
          .json();

        const gasPrice = response["standard"];
        url = `https://ethapi.openocean.finance/v2/2222/swap?inTokenAddress=${rewardTokenAddress}&outTokenAddress=${swapRewardToTokenAddress}&amount=${amount}&gasPrice=${gasPrice}&disabledDexIds=&slippage=${swapRewardsSlippageBips}&account=${execAddress}`;
        console.log(url);
        response = await api
          .get(url, { timeout: 10_000, retry: 0 })
          .json();
        return {
          data: response["data"],
          minOutAmount: response["minOutAmount"]
        };
      default:
        throw Error(`chainId ${gelatoArgs.chainId} not supported`);
    }
  };

  const MAX_COIN_LENS = 5; // max number of coins in curve pool lens. need to provide 0 for other amounts.
  const vault = new Contract(vaultAddress, vaultAbi, provider);
  const curveLens = new Contract(curveLensAddress, curveLensAbi, provider);
  const harvestor = new Contract(execAddress, harvestorAbi, provider);
  const rewardTokenAddress = await harvestor.rewardToken();
  const swapRewardToToken = new Contract(swapRewardToTokenAddress, erc20Abi, provider);

  const curvePoolAddress = await vault.asset();
  const totalRewardsBalanceAfterClaiming = await harvestor.totalRewardsBalanceAfterClaiming();
  console.log("totalRewardTokenBalance", totalRewardsBalanceAfterClaiming.toString());

  const swapInfo = await getSwapInfo(totalRewardsBalanceAfterClaiming.toString());
  console.log("swapInfo", JSON.stringify(swapInfo));

  const minSwapRewardToTokenAmount = BigNumber.from(swapInfo.minOutAmount);
  console.log("minSwapRewardToTokenAmount", minSwapRewardToTokenAmount.toString());

  const totalSwapToTokenBalance = (await swapRewardToToken.balanceOf(execAddress)).add(minSwapRewardToTokenAmount);
  console.log("totalSwapToTokenBalance", totalSwapToTokenBalance.toString());

  const poolNumCoins = await harvestor.poolNumCoins();
  const poolTokenInIndex = await harvestor.poolTokenInIndex();

  const amountsIn = [];
  for (let i = 0; i < MAX_COIN_LENS; i++) {
    if (i === poolTokenInIndex) {
      amountsIn.push(totalSwapToTokenBalance);
      continue;
    }
    amountsIn.push(0);
  }

  const minLpAmount = await curveLens.calc_token_amount(curvePoolAddress, curvePoolAddress, amountsIn, poolNumCoins, true, false);
  console.log("minLpAmount", minLpAmount.toString());

  const iface = new Interface(harvestorAbi);
  const callData = [];

  // dont mint if the amount of lp to mint is too low
  if (minLpAmount.gt(BigNumber.from(minRequiredLpAmount))) {
    callData.push({
      to: execAddress,
      data: iface.encodeFunctionData("run", [minLpAmount.toString(), swapRewardToTokenAddress, constants.MaxUint256.toString(), swapInfo.data.toString()])
    });
  } else {
    return { canExec: false, message: "reward balance too low, not minting lp yet" };
  }

  // Kava not supported on Tenderly...
  //SimulationUrlBuilder.log([gelatoProxyAddress], [callData[0].to], [0], [callData[0].data], [gelatoArgs.chainId]);
  await storage.set("lastTimestamp", timestamp.toString());

  //cast send --rpc-url https://kava-mainnet-archival.gateway.pokt.network/v1/lb/8f10ba8f517b3e72e0adb5ff  --private-key $PRIVATE_KEY --legacy 0x591199E16E006Dec3eDcf79AE0fCea1Dd0F5b69D "add_liquidity(uint256[] memory,uint256)" "[0,4000000]" 0
  const rpcUrl = "https://kava-mainnet-archival.gateway.pokt.network/v1/lb/8f10ba8f517b3e72e0adb5ff";
  console.log(`cast send --private-key=$PRIVATE_KEY --rpc-url=${rpcUrl} --legacy ${execAddress} ${callData[0].data}`);
  return { canExec: true, callData };
});

