import {
  Web3Function,
  Web3FunctionContext,
  Web3FunctionResultCallData,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";

import { type Hex } from "../../utils/types";
import { getDepositAmountOut, getDepositSingleTokenGasLimit, getExecutionFee, getSingleSwapGasLimit } from "../../utils/gm";
import { zeroExQuote } from "../../utils/zeroEx";
import { SimulationUrlBuilder } from "../../utils/tenderly";

const MAX_BENTOBOX_AMOUNT_INCREASE_IN_BIPS = 1000;
const MAX_BENTOBOX_CHANGE_AMOUNT_IN_BIPS = 1000;

const GELATO_PROXY = "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3";

const HARVESTER_ABI = [
  "function run(address,address,uint256,uint256,bytes,uint256,uint256) external payable",
  "function callbackGasLimit() external view returns (uint256)",
];

const MULTI_STAKING_ABI = [
  "function earned(address,address) external view returns (uint256)",
  "function rewards(address,address) external view returns (uint256)",
];

const ERC20_ABI = [
  "function balanceOf(address) external view returns (uint256)",
];

const BIPS = 10_000;

type GmUserArgs = {
  execAddress: Hex;
  zeroExApiEndpoint: string;
  gmApiEndpoint: string;
  maxSwapSlippageBips: number;
  maxDepositSlippageBips: number;
  rewardToken: Hex;
  marketInputToken: Hex;
  dataStoreAddress: Hex;
  gmReaderAddress: Hex;
  stakingAddress: Hex;
  strategyToken: Hex;
};

Web3Function.onRun(async (context: Web3FunctionContext) => {
  try {
    const { userArgs, gelatoArgs: { chainId }, multiChainProvider } = context;
    const {
      execAddress,
      zeroExApiEndpoint,
      gmApiEndpoint,
      maxSwapSlippageBips,
      maxDepositSlippageBips,
      rewardToken,
      marketInputToken,
      dataStoreAddress,
      gmReaderAddress,
      stakingAddress,
      strategyToken,
    } = userArgs as GmUserArgs;
    const provider = multiChainProvider.default();

    const strategyContract = new Contract(execAddress, HARVESTER_ABI, provider);
    const rewardTokenContract = new Contract(rewardToken, ERC20_ABI, provider);
    const stakingContract = new Contract(stakingAddress, MULTI_STAKING_ABI, provider);

    const [balance, earned, rewards, callbackGasLimit] = await Promise.all([
      rewardTokenContract.balanceOf(execAddress),
      stakingContract.earned(execAddress, rewardToken),
      stakingContract.rewards(execAddress, rewardToken),
      strategyContract.callbackGasLimit(),
    ]) as [BigNumber, BigNumber, BigNumber, BigNumber];
    const pendingRewardTokens = balance.add(earned).sub(rewards);
    if (pendingRewardTokens.isZero()) {
      return { canExec: false, message: "No rewards to harvest" };
    }

    const depositRewardToken = rewardToken.toLowerCase() === marketInputToken.toLowerCase();

    let depositAmountIn: BigNumber;
    let swapData: Hex;
    if (depositRewardToken) {
      // Already market market input token --- deposit pending rewards
      depositAmountIn = pendingRewardTokens;
      swapData = `0x`;
    } else {
      // Swap to market input token and deposit output
      const marketInputTokenContract = new Contract(marketInputToken, ERC20_ABI, provider);
      const [quote, marketInputTokenBalance] = await Promise.all([
        context.secrets.get("ZEROX_API_KEY").then((apiKey) => {
          if (apiKey === undefined) {
            throw Error("ZEROX_API_KEY not set in secrets");
          }
          return zeroExQuote({
            endpoint: zeroExApiEndpoint,
            apiKey,
            buyToken: marketInputToken,
            sellToken: rewardToken,
            sellAmount: pendingRewardTokens,
            slippagePercentage: maxSwapSlippageBips / BIPS,
          });
        }),
        marketInputTokenContract.balanceOf(execAddress) as Promise<BigNumber>,
      ]);

      const minimumBuyAmount = BigNumber.from(quote.buyAmount)
        .mul(BIPS - maxSwapSlippageBips)
        .div(BIPS);

      depositAmountIn = minimumBuyAmount.add(marketInputTokenBalance);
      swapData = quote.data;
    }

    const [depositAmountOut, executionFee] = await Promise.all([
      getDepositAmountOut({
        longTokenAmount: depositRewardToken ? depositAmountIn : BigNumber.from(0),
        shortTokenAmount: depositRewardToken ? BigNumber.from(0) : depositAmountIn,
        endpoint: gmApiEndpoint,
        provider,
        readerAddress: gmReaderAddress,
        marketAddress: strategyToken,
        dataStoreAddress,
      }),
      Promise.all([
        getDepositSingleTokenGasLimit({ provider, dataStoreAddress }),
        getSingleSwapGasLimit({ provider, dataStoreAddress }),
        provider.getGasPrice(),
      ]).then(([depositSingleTokenGasLimit, singleSwapGasLimit, gasPrice]) => getExecutionFee({
        provider,
        dataStoreAddress,
        gasLimit: BigNumber.from(callbackGasLimit).add(depositSingleTokenGasLimit).add(singleSwapGasLimit),
        gasPrice,
      })),
    ]);

    const mimimumDepositAmountOut = depositAmountOut.mul(BIPS - maxDepositSlippageBips).div(BIPS);

    const callData: Web3FunctionResultCallData = {
      to: execAddress,
      data: strategyContract.interface.encodeFunctionData("run", [
        rewardToken,
        marketInputToken,
        mimimumDepositAmountOut,
        executionFee,
        swapData,
        MAX_BENTOBOX_AMOUNT_INCREASE_IN_BIPS,
        MAX_BENTOBOX_CHANGE_AMOUNT_IN_BIPS,
      ]),
      value: executionFee.toString(),
    };

    SimulationUrlBuilder.log2(GELATO_PROXY, chainId, [callData]);

    return { canExec: true, callData: [callData] };
  } catch (error) {
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = "Unknown error";
    }
    return { canExec: false, message: errorMessage };
  }
});

