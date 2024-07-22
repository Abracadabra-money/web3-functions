import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const ONE_MINUTE_MILLIS = 60 * 1000;

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
		const { tx } = await automate.prepareBatchExecTask(
			{
				name: "",
				web3FunctionHash: cid,
				trigger: {
					type: TriggerType.TIME,
					interval: ONE_MINUTE_MILLIS,
				},
				web3FunctionArgs: {
					execAddress: "0x8439Ac976aC597C71C0512D8a53697a39E8F9773",
					degenBoxAddress: "0xd96f48665a1410C0cd669A88898ecA36B9Fc2cce",
					lpAddress: "0x38EA452219524Bb87e18dE1C24D3bB59510BD783",
					stgAddress: "0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6",
					gelatoProxyAddress: "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3",
					intervalInSeconds: 86400,
					swapToLpSlippageBips: 50,
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

	{
		console.log("Creating Mainnet Stargate-USDT Task");
		const { tx } = await automate.prepareBatchExecTask(
			{
				name: "",
				web3FunctionHash: cid,
				trigger: {
					type: TriggerType.TIME,
					interval: ONE_MINUTE_MILLIS,
				},
				web3FunctionArgs: {
					execAddress: "0x86130Dac04869a8201c7077270C10f3AFaba1c82",
					degenBoxAddress: "0xd96f48665a1410C0cd669A88898ecA36B9Fc2cce",
					lpAddress: "0x38EA452219524Bb87e18dE1C24D3bB59510BD783",
					stgAddress: "0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6",
					gelatoProxyAddress: "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3",
					intervalInSeconds: 86400,
					swapToLpSlippageBips: 50,
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
