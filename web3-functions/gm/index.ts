import {
	Web3Function,
	type Web3FunctionContext,
	type Web3FunctionResultCallData,
} from "@gelatonetwork/web3-functions-sdk";

import { type Address, encodeFunctionData, parseAbi } from "viem";
import {
	getDepositAmountOut,
	getDepositSingleTokenGasLimit,
	getExecutionFee,
	getSingleSwapGasLimit,
} from "../../utils/gm";
import { SimulationUrlBuilder } from "../../utils/tenderly";
import { createJsonRpcPublicClient } from "../../utils/viem";
import { zeroExQuote } from "../../utils/zeroEx";

const MAX_BENTOBOX_AMOUNT_INCREASE_IN_BIPS = 1000n;
const MAX_BENTOBOX_CHANGE_AMOUNT_IN_BIPS = 1000n;

const GELATO_PROXY = "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3";

const HARVESTER_ABI = parseAbi([
	"function run(address,address,uint256,uint256,bytes,uint256,uint256) external payable",
	"function callbackGasLimit() external view returns (uint256)",
]);

const MULTI_STAKING_ABI = parseAbi([
	"function earned(address,address) external view returns (uint256)",
	"function rewards(address,address) external view returns (uint256)",
]);

const ERC20_ABI = parseAbi([
	"function balanceOf(address) external view returns (uint256)",
]);

const BIPS = 10_000n;

type GmUserArgs = {
	execAddress: Address;
	zeroExApiEndpoint: string;
	gmApiEndpoint: string;
	maxSwapSlippageBips: number;
	maxDepositSlippageBips: number;
	rewardToken: Address;
	marketInputToken: Address;
	dataStoreAddress: Address;
	gmReaderAddress: Address;
	stakingAddress: Address;
	strategyToken: Address;
};

Web3Function.onRun(async (context: Web3FunctionContext) => {
	try {
		const {
			userArgs,
			gelatoArgs: { chainId },
			multiChainProvider,
		} = context;
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

		const client = createJsonRpcPublicClient(multiChainProvider.default());

		const [balance, earned, rewards, callbackGasLimit] = await Promise.all([
			client.readContract({
				abi: ERC20_ABI,
				address: rewardToken,
				functionName: "balanceOf",
				args: [execAddress],
			}),
			client.readContract({
				abi: MULTI_STAKING_ABI,
				address: stakingAddress,
				functionName: "earned",
				args: [execAddress, rewardToken],
			}),
			client.readContract({
				abi: MULTI_STAKING_ABI,
				address: stakingAddress,
				functionName: "rewards",
				args: [execAddress, rewardToken],
			}),
			client.readContract({
				abi: HARVESTER_ABI,
				address: execAddress,
				functionName: "callbackGasLimit",
			}),
		]);
		const pendingRewardTokens = balance + earned - rewards;
		if (pendingRewardTokens === 0n) {
			return { canExec: false, message: "No rewards to harvest" };
		}

		const depositRewardToken =
			rewardToken.toLowerCase() === marketInputToken.toLowerCase();

		let depositAmountIn: bigint;
		let swapData: Address;
		if (depositRewardToken) {
			// Already market market input token --- deposit pending rewards
			depositAmountIn = pendingRewardTokens;
			swapData = "0x";
		} else {
			// Swap to market input token and deposit output
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
						slippagePercentage: maxSwapSlippageBips / Number(BIPS),
					});
				}),
				client.readContract({
					abi: ERC20_ABI,
					address: marketInputToken,
					functionName: "balanceOf",
					args: [execAddress],
				}),
			]);

			const minimumBuyAmount =
				(BigInt(quote.buyAmount) * (BIPS - BigInt(maxSwapSlippageBips))) / BIPS;

			depositAmountIn = minimumBuyAmount + marketInputTokenBalance;
			swapData = quote.data;
		}

		const [depositAmountOut, executionFee] = await Promise.all([
			getDepositAmountOut({
				longTokenAmount: depositRewardToken ? depositAmountIn : 0n,
				shortTokenAmount: depositRewardToken ? 0n : depositAmountIn,
				endpoint: gmApiEndpoint,
				client,
				readerAddress: gmReaderAddress,
				marketAddress: strategyToken,
				dataStoreAddress,
			}),
			Promise.all([
				getDepositSingleTokenGasLimit({ client, dataStoreAddress }),
				getSingleSwapGasLimit({ client, dataStoreAddress }),
				client.getGasPrice(),
			]).then(([depositSingleTokenGasLimit, singleSwapGasLimit, gasPrice]) =>
				getExecutionFee({
					client,
					dataStoreAddress,
					gasLimit:
						callbackGasLimit + depositSingleTokenGasLimit + singleSwapGasLimit,
					gasPrice,
				}),
			),
		]);

		const mimimumDepositAmountOut =
			(depositAmountOut * (BIPS - BigInt(maxDepositSlippageBips))) / BIPS;

		const callData: Web3FunctionResultCallData = {
			to: execAddress,
			data: encodeFunctionData({
				abi: HARVESTER_ABI,
				functionName: "run",
				args: [
					rewardToken,
					marketInputToken,
					mimimumDepositAmountOut,
					executionFee,
					swapData,
					MAX_BENTOBOX_AMOUNT_INCREASE_IN_BIPS,
					MAX_BENTOBOX_CHANGE_AMOUNT_IN_BIPS,
				],
			}),
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
