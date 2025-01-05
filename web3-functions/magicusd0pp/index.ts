import {
	Web3Function,
	type Web3FunctionContext,
	type Web3FunctionResultCallData,
} from "@gelatonetwork/web3-functions-sdk";
import ky from "ky";
import {
	type Address,
	type Hex,
	encodeFunctionData,
	erc20Abi,
	parseAbi,
	parseEther,
} from "viem";
import { odosQuote } from "../../utils/odos";
import { createJsonRpcPublicClient } from "../../utils/viem";

const DISTRIBUTION_ABI = parseAbi([
	"function getOffChainDistributionData() external view returns (uint256 timestamp, bytes32 merkleRoot)",
	"function getOffChainTokensClaimed(address account) external view returns (uint256)",
	"struct QueuedOffChainDistribution { uint256 timestamp; bytes32 merkleRoot; }",
	"function getOffChainDistributionQueue() external view returns (QueuedOffChainDistribution[] memory)",
	"function claimOffChainDistribution(address account, uint256 amount, bytes32[] calldata proof) external",
	"function approveUnchallengedOffChainDistribution() external",
]);

const HARVESTER_ABI = parseAbi([
	"function run(address router, bytes memory swapData, uint256 minAmountOut) external",
]);

const USUAL_DISTRIBUTION_CHALLENGE_PERIOD = 604800n; // 1 week
const WAD = 10n ** 18n;

type MagicUsd0ppUserArgs = {
	distributionAddress: Address;
	harvesterAddress: Address;
	magicUsd0ppAddress: Address;
	usd0ppAddress: Address;
	usualAddress: Address;
	usualApiEndpoint: string;
	odosApiEndpoint: string;
	slippageLimitBps: number;
	minimumSwapUsd: number;
};

type OffChainDistribution = {
	blockHash: Hex;
	merkleRoot: Hex;
	timestamp: string;
	value: `${bigint}`;
	merkleProof: Array<Hex>;
};

Web3Function.onRun(
	async ({ userArgs, multiChainProvider }: Web3FunctionContext) => {
		const {
			distributionAddress,
			harvesterAddress,
			magicUsd0ppAddress,
			usd0ppAddress,
			usualAddress,
			usualApiEndpoint,
			odosApiEndpoint,
			slippageLimitBps,
			minimumSwapUsd,
		} = userArgs as MagicUsd0ppUserArgs;

		const client = createJsonRpcPublicClient(multiChainProvider.default());
		const usualRewardsApi = ky.extend({
			prefixUrl: `${usualApiEndpoint}/rewards`,
		});

		const [
			[, currentMerkleRoot],
			offChainDistributionQueue,
			claimedTokens,
			usualBalance,
			distributions,
		] = await Promise.all([
			client.readContract({
				abi: DISTRIBUTION_ABI,
				address: distributionAddress,
				functionName: "getOffChainDistributionData",
			}),
			client.readContract({
				abi: DISTRIBUTION_ABI,
				address: distributionAddress,
				functionName: "getOffChainDistributionQueue",
			}),
			client.readContract({
				abi: DISTRIBUTION_ABI,
				address: distributionAddress,
				functionName: "getOffChainTokensClaimed",
				args: [magicUsd0ppAddress],
			}),
			client.readContract({
				abi: erc20Abi,
				address: usualAddress,
				functionName: "balanceOf",
				args: [magicUsd0ppAddress],
			}),
			usualRewardsApi
				.get(magicUsd0ppAddress)
				.json<Array<OffChainDistribution>>(),
		]);

		const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
		let pendingDistribution:
			| (typeof offChainDistributionQueue)[number]
			| undefined = undefined;
		for (const distribution of offChainDistributionQueue) {
			if (
				currentTimestamp >=
					distribution.timestamp + USUAL_DISTRIBUTION_CHALLENGE_PERIOD &&
				distribution.timestamp > (pendingDistribution?.timestamp ?? 0n)
			) {
				pendingDistribution = distribution;
			}
		}

		const distributionMerkleRoot =
			pendingDistribution?.merkleRoot ?? currentMerkleRoot;
		const currentDistribution = distributions.find(
			({ merkleRoot }) =>
				merkleRoot.toLowerCase() === distributionMerkleRoot.toLowerCase(),
		);

		let newUsualBalance = usualBalance;
		const callData: Web3FunctionResultCallData[] = [];

		if (currentDistribution !== undefined) {
			const currentDistributionValue = BigInt(currentDistribution.value);

			if (claimedTokens < currentDistributionValue) {
				newUsualBalance += currentDistributionValue - claimedTokens;

				if (pendingDistribution !== undefined) {
					callData.push({
						to: distributionAddress,
						data: encodeFunctionData({
							abi: DISTRIBUTION_ABI,
							functionName: "approveUnchallengedOffChainDistribution",
						}),
					});
				}

				callData.push({
					to: distributionAddress,
					data: encodeFunctionData({
						abi: DISTRIBUTION_ABI,
						functionName: "claimOffChainDistribution",
						args: [
							magicUsd0ppAddress,
							currentDistributionValue,
							currentDistribution.merkleProof,
						],
					}),
				});
			}
		}

		if (newUsualBalance > 0n) {
			const quote = await odosQuote({
				endpoint: odosApiEndpoint,
				chainId: multiChainProvider.default().network.chainId,
				inputTokens: [{ tokenAddress: usualAddress, amount: newUsualBalance }],
				outputTokens: [{ tokenAddress: usd0ppAddress, proportion: 1 }],
				userAddr: harvesterAddress,
				slippageLimitPercent: slippageLimitBps / 100,
				disableRFQs: true,
			});

			if (quote.netOutValue < minimumSwapUsd) {
				return {
					canExec: false,
					message: `Insufficient swap output: ${quote.netOutValue.toLocaleString(
						"en-US",
						{
							style: "currency",
							currency: "USD",
						},
					)}`,
				};
			}

			callData.push({
				to: harvesterAddress,
				data: encodeFunctionData({
					abi: HARVESTER_ABI,
					functionName: "run",
					args: [
						quote.transaction.to,
						quote.transaction.data,
						(quote.outputTokens[0].amount *
							parseEther(`${(10_000 - slippageLimitBps) / 10_000}`)) /
							WAD,
					],
				}),
			});
		}

		if (callData.length === 0) {
			return { canExec: false, message: "No action needed" };
		}

		return {
			canExec: true,
			callData,
		};
	},
);
