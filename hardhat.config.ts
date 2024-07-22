import type { HardhatUserConfig } from "hardhat/config";
import "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import "@nomiclabs/hardhat-ethers";
import "@foundry-rs/hardhat-anvil";

const PRIVATE_KEY =
	process.env.PRIVATE_KEY ??
	"0x0000000000000000000000000000000000000000000000000000000000000001";

const config = {
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
			"bsc",
			"kava",
			"base",
			"linea",
		], //(multiChainProvider) injects provider for these networks
	},
	defaultNetwork: "ethereum",

	networks: {
		anvil: {
			url: "http://127.0.0.1:8545/",
			launch: true,
			chainId: 1,
			forkUrl: "https://rpc.ankr.com/eth",
			accounts: [PRIVATE_KEY],
		},
		ethereum: {
			chainId: 1,
			url: "https://rpc.ankr.com/eth",
			accounts: [PRIVATE_KEY],
		},
		avalanche: {
			url: "https://api.avax.network/ext/bc/C/rpc",
			chainId: 43114,
			accounts: [PRIVATE_KEY],
		},
		arbitrum: {
			chainId: 42161,
			url: "https://arb1.arbitrum.io/rpc",
			accounts: [PRIVATE_KEY],
		},
		fantom: {
			chainId: 250,
			url: "https://rpc2.fantom.network",
			accounts: [PRIVATE_KEY],
		},
		optimism: {
			chainId: 10,
			url: "https://mainnet.optimism.io",
			accounts: [PRIVATE_KEY],
		},
		polygon: {
			chainId: 137,
			url: "https://rpc-mainnet.maticvigil.com",
			accounts: [PRIVATE_KEY],
		},
		bsc: {
			chainId: 56,
			url: "https://bsc.publicnode.com",
			accounts: [PRIVATE_KEY],
		},
		kava: {
			chainId: 2222,
			url: "https://kava-evm.publicnode.com",
			accounts: [PRIVATE_KEY],
		},
		base: {
			chainId: 8453,
			url: "https://base.meowrpc.com",
			accounts: [PRIVATE_KEY],
		},
		linea: {
			chainId: 59144,
			url: "https://rpc.linea.build",
			accounts: [PRIVATE_KEY],
		},
	},
	// biome-ignore lint/complexity/noBannedTypes: Improve auto-completion
} satisfies HardhatUserConfig | Object;

export default config;
