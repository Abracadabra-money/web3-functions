import { HardhatUserConfig } from "hardhat/config";
import "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@foundry-rs/hardhat-anvil";

// Process Env Variables
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

const PRIVATE_KEY = false; //process.env.PRIVATE_KEY;

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
      "bsc"
    ], //(multiChainProvider) injects provider for these networks
  },
  defaultNetwork: "ethereum",

  networks: {
    anvil: {
      url: "http://127.0.0.1:8545/",
      launch: true,
      chainId: 1,
      forkUrl: "https://eth-rpc.gateway.pokt.network",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    ethereum: {
      chainId: 1,
      url: "https://eth-rpc.gateway.pokt.network",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    arbitrum: {
      chainId: 42161,
      url: "https://arb1.arbitrum.io/rpc",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    fantom: {
      chainId: 250,
      url: `https://rpcapi.fantom.network/`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    optimism: {
      chainId: 10,
      url: "https://mainnet.optimism.io",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    polygon: {
      chainId: 137,
      url: "https://rpc-mainnet.maticvigil.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    bsc: {
      chainId: 56,
      url: "https://bsc.publicnode.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    }
  },
};

export default config;
