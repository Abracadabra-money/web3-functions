import {
    Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { StaticJsonRpcProvider } from "@ethersproject/providers";

const rpcSecretKeysPerChainId: { [chainId: number]: string } = {
    2222: "KAVA_RPC_URL",
};

export async function getProvider(context: Web3FunctionContext, chainId: number): Promise<StaticJsonRpcProvider> {
    const rpcSecretKey = rpcSecretKeysPerChainId[chainId];

    if (!rpcSecretKey) {
        const provider = context.multiChainProvider.chainId(chainId);
        if (!provider) {
            throw new Error(`No provider found for chainId ${chainId}`);
        }
    }

    const rpcUrl = await context.secrets.get(rpcSecretKey);
    return new StaticJsonRpcProvider(rpcUrl);
}