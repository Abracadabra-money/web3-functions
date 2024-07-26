import {
	Web3Function,
	type Web3FunctionContext,
	type Web3FunctionResultCallData,
} from "@gelatonetwork/web3-functions-sdk";
import * as R from "remeda";

import {
	type Address,
	encodeFunctionData,
	erc20Abi,
	isAddressEqual,
	parseAbi,
} from "viem";
import {
	getDepositAmountOut,
	getDepositSingleTokenGasLimit,
	getExecutionFee,
	getSingleSwapGasLimit,
} from "../../utils/gm";
import { createJsonRpcPublicClient } from "../../utils/viem";
import { zeroExQuote } from "../../utils/zeroEx";

const MAX_BENTOBOX_AMOUNT_INCREASE_IN_BIPS = 1000n;
const MAX_BENTOBOX_CHANGE_AMOUNT_IN_BIPS = 1000n;

const STRATEGY_ABI = parseAbi([
	"function run(address,address,uint256,uint256,bytes,uint256,uint256) external payable",
	"function callbackGasLimit() external view returns (uint256)",
	"function STAKING() external view returns (address)",
	"function LONG_TOKEN() external view returns (address)",
	"function SHORT_TOKEN() external view returns (address)",
	"function strategyToken() external view returns (address)",
]);

const MULTI_STAKING_ABI = parseAbi([
	"function earned(address,address) external view returns (uint256)",
	"function rewards(address,address) external view returns (uint256)",
]);

const BIPS = 10_000n;

type GmUserArgs = {
	execAddresses: Address[];
	zeroExApiEndpoint: string;
	gmApiEndpoint: string;
	maxSwapSlippageBips: number;
	maxDepositSlippageBips: number;
	rewardToken: Address;
	dataStoreAddress: Address;
	gmReaderAddress: Address;
};

Web3Function.onRun(
	async ({ userArgs, multiChainProvider, secrets }: Web3FunctionContext) => {
		try {
			const {
				execAddresses,
				zeroExApiEndpoint,
				gmApiEndpoint,
				maxSwapSlippageBips,
				maxDepositSlippageBips,
				rewardToken,
				dataStoreAddress,
				gmReaderAddress,
			} = userArgs as GmUserArgs;

			const client = createJsonRpcPublicClient(multiChainProvider.default());

			const zeroxApiKeyPromise = secrets.get("ZEROX_API_KEY");

			const callData = R.pipe(
				await Promise.all(
					execAddresses.map(
						async (
							execAddress,
						): Promise<Web3FunctionResultCallData | undefined> => {
							try {
								const stakingAddressPromise = client.readContract({
									abi: STRATEGY_ABI,
									address: execAddress,
									functionName: "STAKING",
								});

								const [
									balance,
									earned,
									rewards,
									callbackGasLimit,
									longToken,
									shortToken,
									strategyToken,
								] = await Promise.all([
									client.readContract({
										abi: erc20Abi,
										address: rewardToken,
										functionName: "balanceOf",
										args: [execAddress],
									}),
									stakingAddressPromise.then((stakingAddress) =>
										client.readContract({
											abi: MULTI_STAKING_ABI,
											address: stakingAddress,
											functionName: "earned",
											args: [execAddress, rewardToken],
										}),
									),
									stakingAddressPromise.then((stakingAddress) =>
										client.readContract({
											abi: MULTI_STAKING_ABI,
											address: stakingAddress,
											functionName: "rewards",
											args: [execAddress, rewardToken],
										}),
									),
									client.readContract({
										abi: STRATEGY_ABI,
										address: execAddress,
										functionName: "callbackGasLimit",
									}),
									client.readContract({
										abi: STRATEGY_ABI,
										address: execAddress,
										functionName: "LONG_TOKEN",
									}),
									client.readContract({
										abi: STRATEGY_ABI,
										address: execAddress,
										functionName: "SHORT_TOKEN",
									}),
									client.readContract({
										abi: STRATEGY_ABI,
										address: execAddress,
										functionName: "strategyToken",
									}),
								]);
								const pendingRewardTokens = balance + earned - rewards;
								if (pendingRewardTokens === 0n) {
									return undefined;
								}

								const depositRewardToken = isAddressEqual(
									rewardToken,
									longToken,
								);
								const marketInputToken = depositRewardToken
									? longToken
									: shortToken;

								let depositAmountIn: bigint;
								let swapData: Address;
								if (depositRewardToken) {
									// Already market market input token --- deposit pending rewards
									depositAmountIn = pendingRewardTokens;
									swapData = "0x";
								} else {
									// Swap to market input token and deposit output
									const [quote, marketInputTokenBalance] = await Promise.all([
										zeroxApiKeyPromise.then((apiKey) => {
											if (apiKey === undefined) {
												throw new Error("ZEROX_API_KEY not set in secrets");
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
											abi: erc20Abi,
											address: marketInputToken,
											functionName: "balanceOf",
											args: [execAddress],
										}),
									]);

									const minimumBuyAmount =
										(BigInt(quote.buyAmount) *
											(BIPS - BigInt(maxSwapSlippageBips))) /
										BIPS;

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
									]).then(
										([
											depositSingleTokenGasLimit,
											singleSwapGasLimit,
											gasPrice,
										]) =>
											getExecutionFee({
												client,
												dataStoreAddress,
												gasLimit:
													callbackGasLimit +
													depositSingleTokenGasLimit +
													singleSwapGasLimit,
												gasPrice,
											}),
									),
								]);

								const mimimumDepositAmountOut =
									(depositAmountOut * (BIPS - BigInt(maxDepositSlippageBips))) /
									BIPS;

								const callData: Web3FunctionResultCallData = {
									to: execAddress,
									data: encodeFunctionData({
										abi: STRATEGY_ABI,
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

								// SimulationUrlBuilder.log2(GELATO_PROXY, chainId, [callData]);
								return callData;
							} catch (error) {
								if (
									error instanceof Error &&
									error.message === "ZEROX_API_KEY not set in secrets"
								) {
									throw error;
								}

								return undefined;
							}
						},
					),
				),
				R.filter(R.isDefined),
			);

			if (callData.length === 0) {
				return { canExec: false, message: "No rewards harvest" };
			}

			return { canExec: true, callData: callData };
		} catch (error) {
			let errorMessage: string;
			if (error instanceof Error) {
				errorMessage = error.message;
			} else {
				errorMessage = "Unknown error";
			}
			return { canExec: false, message: errorMessage };
		}
	},
);
