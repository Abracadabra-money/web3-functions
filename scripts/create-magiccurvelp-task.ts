import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const TEN_MINUTES_MILLIS = 10 * 60 * 1000;

const { ethers, w3f } = hre;

const main = async () => {
	const stargateW3f = w3f.get("magiccurvelp");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await stargateW3f.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	{
		console.log("Creating Kava MagicCurveLP MIM/USDT Task");
		const { tx } = await automate.prepareBatchExecTask(
			{
				name: "",
				web3FunctionHash: cid,
				trigger: {
					type: TriggerType.TIME,
					interval: TEN_MINUTES_MILLIS,
				},
				web3FunctionArgs: {
					execAddress: "",
					vaultAddress: "",
					swapRewardToTokenAddress:
						"0x919c1c267bc06a7039e03fcc2ef738525769109c", // USDT
					curveLensAddress: "0x5552b631e2ad801faa129aacf4b701071cc9d1f7",
					minRequiredLpAmount: "100000000000000000000", // 100 lp min
					intervalInSeconds: 86400,
					swapRewardsSlippageBips: 100, // wKAVA -> USDT 1% slippage
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
