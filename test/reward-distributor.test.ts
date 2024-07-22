import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	setDefaultTimeout,
	test,
} from "bun:test";
import path from "node:path";
import type { JsonRpcProvider } from "@ethersproject/providers";
import type { Anvil } from "@viem/anvil";
import type { Merge } from "type-fest";
import {
	type Address,
	type Hex,
	type PublicClient,
	type TestClient,
	encodeFunctionData,
	parseAbi,
} from "viem";
import { ARBITRUM_OPS_SAFE, ARBITRUM_SPELL } from "../utils/constants";
import { runWeb3Function } from "./utils";
import { setupAnvil } from "./utils/setupAnvil";

const w3fName = "reward-distributor";
const w3fRootDir = path.join("web3-functions");
const w3fPath = path.join(w3fRootDir, w3fName, "index.ts");

setDefaultTimeout(120_000);
describe("Reward Distributor Web3 Function test", () => {
	let anvil: Anvil;
	let provider: JsonRpcProvider;
	let testClient: Omit<Merge<PublicClient, TestClient>, "mode">;
	let snapshotId: Hex;

	beforeAll(async () => {
		({ anvil, provider, testClient, snapshotId } = await setupAnvil({
			forkUrl: process.env.ARBITRUM_RPC_URL,
			forkBlockNumber: 234134609n,
		}));
	});

	afterAll(async () => {
		await anvil.stop();
	});

	afterEach(async () => {
		await testClient.revert({ id: snapshotId });
	});

	const run = async () =>
		runWeb3Function(
			w3fPath,
			{
				gelatoArgs: {
					chainId: (await provider.getNetwork()).chainId,
					gasPrice: (await provider.getGasPrice()).toString(),
				},
				userArgs: {
					multiRewardDistributorAddress:
						"0xbF5DC3f598AFA173135160CDFce6BFeE45c912eF",
					multiRewardStakingAddresses: [
						"0x280c64c4C4869CF2A6762EaDD4701360C1B11F97",
						"0xc30911b52b5752447aB08615973e434c801CD652",
					],
					epochBasedDistributorAddress:
						"0x111AbF466654c166Ee4AC15d6A29a3e0625533db",
					epochBasedStakingAddresses: [],
				},
				secrets: {},
				storage: {},
			},
			[provider],
		);

	test("canExec: true - Multiple distributions", async () => {
		const { result } = await run();

		expect(result).toEqual({
			canExec: true,
			callData: [
				{
					data: "0x63453ae1000000000000000000000000280c64c4c4869cf2a6762eadd4701360c1b11f97",
					to: "0xbF5DC3f598AFA173135160CDFce6BFeE45c912eF",
				},
				{
					data: "0x63453ae1000000000000000000000000c30911b52b5752447ab08615973e434c801cd652",
					to: "0xbF5DC3f598AFA173135160CDFce6BFeE45c912eF",
				},
			],
		});
	});
	test("canExec: true - Single distributions", async () => {
		const execAddress =
			"0x280c64c4C4869CF2A6762EaDD4701360C1B11F97" as const satisfies Address;
		await testClient.sendUnsignedTransaction({
			from: ARBITRUM_OPS_SAFE,
			to: "0xbF5DC3f598AFA173135160CDFce6BFeE45c912eF",
			data: encodeFunctionData({
				abi: parseAbi(["function distribute(address) external"]),
				functionName: "distribute",
				args: [execAddress],
			}),
			gasPrice: 0n,
		});

		const { result } = await run();

		expect(result).toEqual({
			canExec: true,
			callData: [
				{
					data: "0x63453ae1000000000000000000000000c30911b52b5752447ab08615973e434c801cd652",
					to: "0xbF5DC3f598AFA173135160CDFce6BFeE45c912eF",
				},
			],
		});
	});
	test("canExec: false - No distributions to execute", async () => {
		// Increase approval
		await testClient.setStorageAt({
			address: ARBITRUM_SPELL,
			index:
				"0xe291b9f68327d6549fd70e333daad56b6cdb38ac27f870dafc9c5d1dcd54d5a5",
			value:
				"0x0000000000000000000000000000000000000000002116545850052128000000",
		});

		const execAddresses = [
			"0x280c64c4C4869CF2A6762EaDD4701360C1B11F97",
			"0xc30911b52b5752447ab08615973e434c801cd652",
		] as const satisfies Array<Address>;

		await Promise.all(
			execAddresses.map(
				async (execAddress) =>
					await testClient.sendUnsignedTransaction({
						from: ARBITRUM_OPS_SAFE,
						to: "0xbF5DC3f598AFA173135160CDFce6BFeE45c912eF",
						data: encodeFunctionData({
							abi: parseAbi(["function distribute(address) external"]),
							functionName: "distribute",
							args: [execAddress],
						}),
						gasPrice: 0n,
					}),
			),
		);

		const { result } = await run();

		expect(result).toEqual({
			canExec: false,
			message: "No distributions to execute",
		});
	});
});
