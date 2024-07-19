import { AutomateSDK } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";

const { ethers, w3f } = hre;

const main = async () => {
	const stargateW3f = w3f.get("stargate-v1");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await stargateW3f.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	{
		console.log("Creating Mainnet Stargate-USDC Task");
		const task = await automate.createBatchExecTask({
			name: "",
			web3FunctionHash: cid,
			web3FunctionArgs: {
				execAddress: "0x8439Ac976aC597C71C0512D8a53697a39E8F9773",
				degenBoxAddress: "0xd96f48665a1410C0cd669A88898ecA36B9Fc2cce",
				lpAddress: "0x38EA452219524Bb87e18dE1C24D3bB59510BD783",
				stgAddress: "0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6",
				gelatoProxyAddress: "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3",
				intervalInSeconds: 86400,
				swapToLpSlippageBips: 50,
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
		console.log("Creating Mainnet Stargate-USDT Task");
		const task = await automate.createBatchExecTask({
			name: "",
			web3FunctionHash: cid,
			web3FunctionArgs: {
				execAddress: "0x86130Dac04869a8201c7077270C10f3AFaba1c82",
				degenBoxAddress: "0xd96f48665a1410C0cd669A88898ecA36B9Fc2cce",
				lpAddress: "0x38EA452219524Bb87e18dE1C24D3bB59510BD783",
				stgAddress: "0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6",
				gelatoProxyAddress: "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3",
				intervalInSeconds: 86400,
				swapToLpSlippageBips: 50,
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
