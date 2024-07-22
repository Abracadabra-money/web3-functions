import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const TEN_MINUTES_MILLIS = 10 * 60 * 1000;

const { ethers, w3f } = hre;

const main = async () => {
	const magicapeW3f = w3f.get("magicape");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await magicapeW3f.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	{
		console.log("Creating Task");
		const { tx } = await automate.prepareBatchExecTask(
			{
				name: "MagicAPE",
				web3FunctionHash: cid,
				trigger: {
					type: TriggerType.TIME,
					interval: TEN_MINUTES_MILLIS,
				},
				web3FunctionArgs: {
					execAddress: "0x598330D0F504297f53799e37CfF80ed564eB3525",
					intervalInSeconds: 604800,
				},
			},
			{},
			DEVOPS_SAFE,
		);
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
