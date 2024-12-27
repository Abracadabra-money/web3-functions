import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const { ethers, w3f } = hre;

const THIRTY_SECONDS = 30 * 1000;

const main = async () => {
	const magicUsd0pp = w3f.get("magicusd0pp");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await magicUsd0pp.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	const { tx } = await automate.prepareBatchExecTask(
		{
			name: "MagicUSD0pp Off-Chain Distribution Claimer",
			web3FunctionHash: cid,
			trigger: {
				type: TriggerType.TIME,
				interval: THIRTY_SECONDS,
			},
			web3FunctionArgs: {
				execAddress: "0x75cC0C0DDD2Ccafe6EC415bE686267588011E36A",
				usualApiEndpoint: "https://app.usual.money/api/rewards",
				magicUsd0ppAddress: "0x73075fD1522893D9dC922991542f98F08F2c1C99",
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
