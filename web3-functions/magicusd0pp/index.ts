import {
	Web3Function,
	type Web3FunctionContext,
	Web3FunctionResult,
} from "@gelatonetwork/web3-functions-sdk";
import ky from "ky";
import { type Address, type Hex, encodeFunctionData, parseAbi } from "viem";
import { createJsonRpcPublicClient } from "../../utils/viem";

const DISTRIBUTION_ABI = parseAbi([
	"function getOffChainDistributionData() external view returns (uint256 timestamp, bytes32 merkleRoot)",
	"function getOffChainTokensClaimed(address account) external view returns (uint256)",
	"function claimOffChainDistribution(address account, uint256 amount, bytes32[] calldata proof) external",
]);

type MagicUsd0ppUserArgs = {
	execAddress: Address;
	usualApiEndpoint: string;
	magicUsd0ppAddress: Address;
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
		const { execAddress, usualApiEndpoint, magicUsd0ppAddress } =
			userArgs as MagicUsd0ppUserArgs;

		const client = createJsonRpcPublicClient(multiChainProvider.default());
		const usualRewardsApi = ky.extend({
			prefixUrl: new URL("rewards", new URL(usualApiEndpoint)),
		});

		const [[, currentMerkleRoot], claimedTokens, distributions] =
			await Promise.all([
				client.readContract({
					abi: DISTRIBUTION_ABI,
					address: execAddress,
					functionName: "getOffChainDistributionData",
				}),
				client.readContract({
					abi: DISTRIBUTION_ABI,
					address: execAddress,
					functionName: "getOffChainTokensClaimed",
					args: [magicUsd0ppAddress],
				}),
				usualRewardsApi
					.get(magicUsd0ppAddress)
					.json<Array<OffChainDistribution>>(),
			]);

		if (distributions.length === 0) {
			return { canExec: false, message: "No distributions" };
		}

		const currentDistribution = distributions.find(
			({ merkleRoot }) =>
				merkleRoot.toLowerCase() === currentMerkleRoot.toLowerCase(),
		);

		if (currentDistribution === undefined) {
			return { canExec: false, message: "No matching distribution" };
		}

		if (claimedTokens === BigInt(currentDistribution.value)) {
			return { canExec: false, message: "Already claimed latest distribution" };
		}

		return {
			canExec: true,
			callData: [
				{
					to: execAddress,
					data: encodeFunctionData({
						abi: DISTRIBUTION_ABI,
						functionName: "claimOffChainDistribution",
						args: [
							magicUsd0ppAddress,
							BigInt(currentDistribution.value),
							currentDistribution.merkleProof,
						],
					}),
				},
			],
		};
	},
);
