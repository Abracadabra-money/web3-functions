import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const ONE_MINUTE_MILLIS = 60 * 1000;

const { ethers, w3f } = hre;

const main = async () => {
	const stargateW3f = w3f.get("stargate-v2");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await stargateW3f.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	{
		console.log("Creating Arbitrum->Kava Stargate-USDT Task");
		const { tx } = await automate.prepareBatchExecTask(
			{
				name: "",
				web3FunctionHash: cid,
				trigger: {
					type: TriggerType.TIME,
					interval: ONE_MINUTE_MILLIS,
				},
				web3FunctionArgs: {
					execAddress: "0x30D525cbB79D2baaE7637eA748631a6360Ce7c16",
					degenBoxAddress: "0x630FC1758De85C566Bdec1D75A894794E1819d7E",
					lpAddress: "0xAad094F6A75A14417d39f04E690fC216f080A41a",
					rewardAddress: "0xc86c7C0eFbd6A49B35E8714C5f59D99De09A225b",
					underlyingAddress: "0x919C1c267BC06a7039e03fcc2eF738525769109c",
					strategyExecutorAddress: "0x84C9Bb8B81037C642f2Eb6486a9bdfF526CdEbe0",
					gelatoProxyAddress: "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3",
					minRewardAmount: "10000000000000000000",
					intervalInSeconds: 86400,
					swapSlippageBips: 50,
					targetChainId: 2222,
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
