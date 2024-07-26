import { JsonRpcProvider } from "@ethersproject/providers";
import { type CreateAnvilOptions, createAnvil } from "@viem/anvil";
import * as R from "remeda";
import { http, type Chain, createTestClient, publicActions } from "viem";

const defaultCreateAnvilOptions: CreateAnvilOptions = {
	blockBaseFeePerGas: 0n,
	gasPrice: 0n,
	startTimeout: 60_000,
	stopTimeout: 60_000,
};

export async function setupAnvil(
	createAnvilOptions: CreateAnvilOptions = defaultCreateAnvilOptions,
) {
	const anvil = createAnvil(
		R.merge(defaultCreateAnvilOptions, createAnvilOptions),
	);

	await anvil.start();

	const anvilEndpoint = `http://${anvil.host}:${anvil.port}`;
	const provider = new JsonRpcProvider(anvilEndpoint);
	const testClient = createTestClient({
		chain: {
			contracts: {
				multicall3: {
					address: "0xcA11bde05977b3631167028862bE2a173976CA11",
				},
			},
		} as unknown as Chain,
		transport: http(`http://${anvil.host}:${anvil.port}`),
		mode: "anvil",
	}).extend(publicActions);
	const snapshotId = await testClient.snapshot();

	return { anvil, anvilEndpoint, provider, testClient, snapshotId };
}
