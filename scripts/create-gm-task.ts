import {
	AutomateSDK,
	type CreateBatchExecTaskOptions,
	TriggerType,
	type Web3FunctionUserArgs,
} from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const { ethers, w3f } = hre;

const EIGHT_HOURS_MILLIS = 8 * 60 * 60 * 1000;

const main = async () => {
	const gm = w3f.get("gm");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await gm.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	const { tx } = await automate.prepareBatchExecTask(
		{
			name: "GM Strategy Harvester",
			web3FunctionHash: cid,
			trigger: {
				type: TriggerType.TIME,
				interval: EIGHT_HOURS_MILLIS,
			},
			web3FunctionArgs: {
				execAddresses: [
					"0xB24e6957D965A9c6e70fe210D63617e5d0c5CD59",
					"0x6EddFDBc3b7B86E857B78cd0d4bA395275d7cc16",
					"0x552F8a801d2Dd4982B226622e20EC6B633e27941",
					"0x0e3a799ecFeaCDc96EaF127f06F409Ac641c61FE",
					"0x394d8B3982f64a4eD671364Da574152D4255f220",
				],
				zeroExApiEndpoint: "https://arbitrum.api.0x.org/",
				gmApiEndpoint: "https://arbitrum-api.gmxinfra.io/",
				maxSwapSlippageBips: 100,
				maxDepositSlippageBips: 50,
				rewardToken: "0x912CE59144191C1204E64559FE8253a0e49E6548",
				dataStoreAddress: "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8",
				gmReaderAddress: "0x5Ca84c34a381434786738735265b9f3FD814b824",
			},
		},
		{},
		DEVOPS_SAFE,
	);
	console.log(`to: ${tx.to}`);
	console.log(tx.data);
	console.log("------------------");
	console.log();
};

main()
	.then(() => {
		process.exit();
	})
	.catch((err) => {
		console.error("Error:", err.message);
		process.exit(1);
	});
