import { AutomateSDK } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";

const { ethers, w3f } = hre;

const main = async () => {
	const velodromeOpUsdcw3f = w3f.get("velodrome-op-usdc");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await velodromeOpUsdcw3f.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	{
		console.log("Creating Task");
		const task = await automate.createBatchExecTask({
			name: "Velodrome vOP/USDC",
			web3FunctionHash: cid,
			web3FunctionArgs: {
				execAddress: "0x7E05363E225c1c8096b1cd233B59457104B84908",
				intervalInSeconds: 604800,
				strategy: "0xa3372cd2178c52fdcb1f6e4c4e93014b4db3b20d",
				strategyLens: "0x8BEE5Db2315Df7868295c531B36BaA53439cf528",
				wrapper: "0x6eb1709e0b562097bf1cc48bc6a378446c297c04",
				pair: "0x47029bc8f5cbe3b464004e87ef9c9419a48018cd",
				router: "0xa132DAB612dB5cB9fC9Ac426A0Cc215A3423F9c9",
				factory: "0x25CbdDb98b35ab1FF77413456B31EC81A6B6B746",
				wrapperRewardQuoteSlippageBips: 100,
				strategyRewardQuoteSlippageBips: 100,
				maxBentoBoxAmountIncreaseInBips: 1,
				maxBentoBoxChangeAmountInBips: 1000,
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
