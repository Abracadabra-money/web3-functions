import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const ONE_MINUTE_MILLIS = 60 * 1000;

const { ethers, w3f } = hre;

const main = async () => {
	const spellStakingW3f = w3f.get("spell-staking");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await spellStakingW3f.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	{
		console.log("Creating Mainnet Task");
		const { tx } = await automate.prepareBatchExecTask(
			{
				name: "SpellStaking: Withdraw & Distribute",
				web3FunctionHash: cid,
				trigger: {
					type: TriggerType.TIME,
					interval: ONE_MINUTE_MILLIS,
				},
				web3FunctionArgs: {
					// not used on mainnet
					bridgingMinMIMAmount: "0",

					// parameters
					treasuryPercentage: 50,
					intervalInSeconds: 201600, // 3x a week
					distributionMinMIMAmount: "100000000000000000000",
				},
			},
			{},
			"0x48c18844530c96AaCf24568fa7F912846aAc12B9",
		);
		console.log(`to: ${tx.to}`);
		console.log(tx.data);
		console.log("------------------");
		console.log();
	}

	const ALTCHAIN_IDS = [250, 43114, 42161];

	for (const chainId of ALTCHAIN_IDS) {
		console.log(`Creating ChainId ${chainId} Task`);
		const { tx } = await automate.prepareBatchExecTask(
			{
				name: "SpellStaking: Withdraw & Bridge",
				web3FunctionHash: cid,
				trigger: {
					type: TriggerType.TIME,
					interval: ONE_MINUTE_MILLIS,
				},
				web3FunctionArgs: {
					// not used on altchain
					treasuryPercentage: 0,
					distributionMinMIMAmount: "0",

					// parameters
					bridgingMinMIMAmount: "50000000000000000000", // 50 MIM require to bridge
					intervalInSeconds: 201600, // 3x a week
				},
			},
			{},
			DEVOPS_SAFE,
		);

		//await automate.cancelTask(taskId);

		console.log(`to: ${tx.to}`);
		console.log(tx.data);
		console.log("------------------");
		console.log();
	}
};

main()
	.then(() => {
		process.exit();
	})
	.catch((err) => {
		console.error("Error:", err.message);
		process.exit(1);
	});
