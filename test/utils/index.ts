import type { JsonRpcProvider } from "@ethersproject/providers";
import type {
	MultiChainProviderConfig,
	Web3FunctionContextData,
	Web3FunctionRunnerOptions,
} from "@gelatonetwork/web3-functions-sdk";
import { Web3FunctionBuilder } from "@gelatonetwork/web3-functions-sdk/builder";
import { Web3FunctionRunner } from "@gelatonetwork/web3-functions-sdk/runtime";

export const MAX_RPC_LIMIT = 50;
export const MAX_DOWNLOAD_LIMIT = 10 * 1024 * 1024;
export const MAX_UPLOAD_LIMIT = 5 * 1024 * 1024;
export const MAX_REQUEST_LIMIT = 100;
export const MAX_STORAGE_LIMIT = 1 * 1024 * 1024;

export const runWeb3Function = async (
	web3FunctionPath: string,
	context: Web3FunctionContextData<"onRun">,
	providers: JsonRpcProvider[],
) => {
	const buildRes = await Web3FunctionBuilder.build(web3FunctionPath, {
		debug: false,
	});

	if (!buildRes.success) {
		throw new Error(`Fail to build web3Function: ${buildRes.error}`);
	}

	const options: Web3FunctionRunnerOptions = {
		runtime: "thread",
		showLogs: true,
		memory: buildRes.schema.memory,
		downloadLimit: MAX_DOWNLOAD_LIMIT,
		uploadLimit: MAX_UPLOAD_LIMIT,
		requestLimit: MAX_REQUEST_LIMIT,
		rpcLimit: MAX_RPC_LIMIT,
		timeout: buildRes.schema.timeout * 1000,
		storageLimit: MAX_STORAGE_LIMIT,
	};
	const script = buildRes.filePath;

	const multiChainProviderConfig: MultiChainProviderConfig = {};

	for (const provider of providers) {
		const chainId = (await provider.getNetwork()).chainId;

		multiChainProviderConfig[chainId] = provider;
	}

	const runner = new Web3FunctionRunner(false);
	const res = await runner.run("onRun", {
		script,
		context,
		options,
		version: buildRes.schema.web3FunctionVersion,
		multiChainProviderConfig,
	});

	if (!res.success) {
		throw new Error(`Fail to run web3 function: ${res.error.message}`);
	}

	return res;
};
