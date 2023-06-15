import { HardhatUserConfig } from "hardhat/config";
import "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

// Process Env Variables
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

const config: HardhatUserConfig = {
  w3f: {
    rootDir: "./web3-functions",
    debug: false,
    networks: [
      "ethereum",
      "avalanche",
      "arbitrum",
      "fantom",
      "optimism",
      "polygon",
    ], //(multiChainProvider) injects provider for these networks
  },
  defaultNetwork: "ethereum",

  networks: {
    ethereum: {
      chainId: 1,
      url: "https://eth-rpc.gateway.pokt.network",
      accounts: [],
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: [],
    },
    arbitrum: {
      chainId: 42161,
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [],
    },
    fantom: {
      chainId: 250,
      url: `https://rpcapi.fantom.network/`,
      accounts: [],
    },
    optimism: {
      chainId: 10,
      url: "https://mainnet.optimism.io",
      accounts: [],
    },
    polygon: {
      chainId: 137,
      url: "https://rpc-mainnet.maticvigil.com",
      accounts: [],
    },
  },
};

export default config;
