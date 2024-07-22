import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const { ethers, w3f } = hre;

const THIRTY_SECONDS = 30 * 1000;

const main = async () => {
	const rewardDistributor = w3f.get("reward-distributor");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await rewardDistributor.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	const { tx } = await automate.prepareBatchExecTask(
		{
			name: "Reward Distributor",
			web3FunctionHash: cid,
			trigger: {
				type: TriggerType.TIME,
				interval: THIRTY_SECONDS,
			},
			web3FunctionArgs: {
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
