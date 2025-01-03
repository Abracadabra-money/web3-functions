import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const { ethers, w3f } = hre;

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
			name: "MagicUSD0pp Handler",
			web3FunctionHash: cid,
			trigger: {
				type: TriggerType.BLOCK,
			},
			web3FunctionArgs: {
				distributionAddress: "0x75cC0C0DDD2Ccafe6EC415bE686267588011E36A",
				harvesterAddress: "0x80014629Ca75441599A1efd2283E3f71A8EC0AAB",
				magicUsd0ppAddress: "0x73075fD1522893D9dC922991542f98F08F2c1C99",
				usd0ppAddress: "0x35D8949372D46B7a3D5A56006AE77B215fc69bC0",
				usualAddress: "0xC4441c2BE5d8fA8126822B9929CA0b81Ea0DE38E",
				usualApiEndpoint: "https://app.usual.money/api",
				odosApiEndpoint: "https://api.odos.xyz",
				slippageLimitBps: 10,
				minimumSwapUsd: 1000,
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
