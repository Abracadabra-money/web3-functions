import {
	Web3Function,
	type Web3FunctionContext,
	type Web3FunctionResultCallData,
} from "@gelatonetwork/web3-functions-sdk";
import * as R from "remeda";
import {
	type Address,
	type PublicClient,
	encodeFunctionData,
	parseAbi,
} from "viem";
import { createJsonRpcPublicClient } from "../../utils/viem";

const rewardDistributorAbi = parseAbi([
	"function distribute(address _staking) external",
	"function ready(address _staking) public view returns (bool)",
]);

type RewardDistributorUserArgs = {
	multiRewardDistributorAddress: Address;
	multiRewardStakingAddresses: Address[];
	epochBasedDistributorAddress: Address;
	epochBasedStakingAddresses: Address[];
};

Web3Function.onRun(
	async ({ userArgs, multiChainProvider }: Web3FunctionContext) => {
		const {
			multiRewardDistributorAddress,
			multiRewardStakingAddresses,
			epochBasedDistributorAddress,
			epochBasedStakingAddresses,
		} = userArgs as RewardDistributorUserArgs;
		const configurations = R.fromEntries([
			[multiRewardDistributorAddress, multiRewardStakingAddresses],
			[epochBasedDistributorAddress, epochBasedStakingAddresses],
		]);

		const client = createJsonRpcPublicClient(multiChainProvider.default());

		const distributions = R.pipe(
			await R.pipe(
				configurations,
				R.entries(),
				R.flatMap(([rewardDistributorAddress, stakingAddresses]) =>
					stakingAddresses.map((stakingAddress) =>
						distributionCallData(
							client,
							rewardDistributorAddress,
							stakingAddress,
						),
					),
				),
				(results) => Promise.all(results),
			),
			R.filter(R.isDefined),
		);

		if (distributions.length === 0) {
			return { canExec: false, message: "No distributions to execute" };
		}

		return {
			canExec: true,
			callData: distributions,
		};
	},
);

async function distributionCallData(
	client: PublicClient,
	rewardDistributorAddress: Address,
	stakingAddress: Address,
): Promise<Web3FunctionResultCallData | undefined> {
	const ready = await client.readContract({
		address: rewardDistributorAddress,
		abi: rewardDistributorAbi,
		functionName: "ready",
		args: [stakingAddress],
	});

	if (!ready) {
		return undefined;
	}

	return {
		to: rewardDistributorAddress,
		data: encodeFunctionData({
			abi: rewardDistributorAbi,
			functionName: "distribute",
			args: [stakingAddress],
		}),
	};
}
