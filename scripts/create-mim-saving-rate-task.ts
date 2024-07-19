import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";

const { ethers, w3f } = hre;

const THIRTY_SECONDS = 30 * 1000;

const main = async () => {
	const mimSavingRate = w3f.get("mim-saving-rate");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await mimSavingRate.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	const task = await automate.prepareBatchExecTask(
		{
			name: "MIM Saving Rate",
			web3FunctionHash: cid,
			trigger: {
				type: TriggerType.TIME,
				interval: THIRTY_SECONDS,
			},
			web3FunctionArgs: {
				execAddress: "0x98164deD88e2a4862BdE8E7D4B831a6e3BE02D0A",
				subgraphUrl:
					"https://api.studio.thegraph.com/query/59137/mim-saving-rate-arbitrum/version/latest",
				lockLimitPerExecution: 100,
			},
		},
		{},
		"0x48c18844530c96AaCf24568fa7F912846aAc12B9",
	);
	console.log(`to: ${task.tx.to}`);
	console.log(task.tx.data);
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
