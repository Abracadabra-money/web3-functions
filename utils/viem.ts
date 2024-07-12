import { ethers } from "ethers";
import { createClient, custom, type Chain, publicActions } from "viem";

export function createJsonRpcPublicClient(provider: ethers.providers.JsonRpcProvider) {
  return createClient({
    batch: {
      multicall: true,
    },
    chain: {
      contracts: {
        multicall3: {
          address: '0xcA11bde05977b3631167028862bE2a173976CA11'
        },
      }
    } as unknown as Chain,
    transport: custom({
      request: async ({ method, params }) => provider.send(method, params),
    }),
  }).extend(publicActions)
}
