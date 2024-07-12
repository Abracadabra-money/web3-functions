import {
	Web3Function,
	type Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import {
	type TypedDocumentNode,
	createClient,
	fetchExchange,
	gql,
} from "@urql/core";
import { Contract } from "ethers";
import type { Hex } from "../../utils/types";

const LOCKING_MULTI_REWARDS_ABI = [
	"function processExpiredLocks(address[],uint256[]) external",
];

type UserLock = { user: { id: Hex }; lockIndex: `${bigint}` };

type UserLocksResponse = {
	userLocks: UserLock[];
};

type MsrUserArgs = {
	execAddress: Hex;
	subgraphUrl: string;
	lockLimitPerExecution: number;
};

const userLocksQuery: TypedDocumentNode<
	UserLocksResponse,
	{ lockLimit: number; minimumUnlockTime: number }
> = gql`
  query($lockLimit: Int, $minimumUnlockTime: BigInt) {
    userLocks(first: $lockLimit, where: { unlockTime_lte: $minimumUnlockTime }, orderBy: unlockTime, orderDirection: asc) {
      user {
        id
      }
      lockIndex
    }
  }
`;

Web3Function.onRun(async ({ userArgs }: Web3FunctionContext) => {
	const { execAddress, subgraphUrl, lockLimitPerExecution } =
		userArgs as MsrUserArgs;

	const graphQlClient = createClient({
		url: subgraphUrl,
		exchanges: [fetchExchange],
	});

	const userLocksResponse = await graphQlClient.query(userLocksQuery, {
		lockLimit: lockLimitPerExecution,
		minimumUnlockTime: Math.floor(Date.now() / 1000),
	});

	if (userLocksResponse.error !== undefined) {
		return { canExec: false, message: userLocksResponse.error.message };
	}

	const userLocks = userLocksResponse.data?.userLocks ?? [];

	if (userLocks.length === 0) {
		return { canExec: false, message: "No locks to release" };
	}

	const userLocksGrouped: Record<Hex, UserLock["lockIndex"][]> = {};
	for (const userLock of userLocks) {
		userLocksGrouped[userLock.user.id] ??= [];
		userLocksGrouped[userLock.user.id].push(userLock.lockIndex);
	}

	const userLocksGroupedEntries = Object.entries(userLocksGrouped);
	const users = userLocksGroupedEntries.map(([user, _]) => user);
	const locks = userLocksGroupedEntries.map(([_, locks]) => locks[0]);

	const lockingMultiRewardsContract = new Contract(
		execAddress,
		LOCKING_MULTI_REWARDS_ABI,
	);

	return {
		canExec: true,
		callData: [
			{
				to: execAddress,
				data: lockingMultiRewardsContract.interface.encodeFunctionData(
					"processExpiredLocks",
					[users, locks],
				),
			},
		],
	};
});
