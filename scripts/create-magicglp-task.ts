import { AutomateSDK } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";

const { ethers, w3f } = hre;

const main = async () => {
	const magicglpW3f = w3f.get("magicglp");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await magicglpW3f.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	{
		console.log("Creating Arbitrum Task");
		const task = await automate.createBatchExecTask({
			name: "Arbitrum: MagicGLP",
			web3FunctionHash: cid,
			web3FunctionArgs: {
				execAddress: "0xc99A4863173Ef52CCB7EA05440da0e37bA39c139",
				lensAddress: "0xe121904194eb69e5b589b58edcbc5b74069787c3",
				rewardToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
				rewardTokenChainlinkAddress:
					"0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
				magicGlpOracleAddress: "0x4ED0935ecC03D7FcEfb059e279BCD910a02F284C",
				maxApyInBips: 10000,
				mintGlpSlippageInBips: 100,
				intervalInSeconds: 3600,
			},
		});
		console.log(`to: ${task.tx.to}`);
		const data = task.tx.data.replace(
			"9a688cc56f5f4fc75eaf8fdf18f43260ae43647c",
			"4D0c7842cD6a04f8EDB39883Db7817160DA159C3",
		);
		console.log(data);
		console.log("------------------");
		console.log();
	}

	{
		console.log("Creating Avalanche Task");
		const task = await automate.createBatchExecTask({
			name: "Avalanche: MagicGLP",
			web3FunctionHash: cid,
			web3FunctionArgs: {
				execAddress: "0x05b3b96dF07B4630373aE7506e51777b547335b0",
				lensAddress: "0x1589dEFC3Abb8ac5D0e86c19Fb940874Ea788c69",
				rewardToken: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
				rewardTokenChainlinkAddress:
					"0x0A77230d17318075983913bC2145DB16C7366156",
				magicGlpOracleAddress: "0x3Cc89EA432c36c8F96731765997722192202459D",
				maxApyInBips: 10000,
				mintGlpSlippageInBips: 100,
				intervalInSeconds: 604800,
			},
		});
		console.log(`to: ${task.tx.to}`);
		const data = task.tx.data.replace(
			"9a688cc56f5f4fc75eaf8fdf18f43260ae43647c",
			"4D0c7842cD6a04f8EDB39883Db7817160DA159C3",
		);
		console.log(data);
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
