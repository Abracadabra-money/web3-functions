import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const { ethers, w3f } = hre;

const FIVE_MINUTES_MILLIS = 5 * 60 * 1000;
const FOUR_HOURS_SECONDS = 4 * 60 * 60;

const main = async () => {
	const spellSwapperW3f = w3f.get("spell-swapper");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await spellSwapperW3f.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	console.log("Creating Mainnet Task");
	const {
		tx: { to, data },
	} = await automate.prepareBatchExecTask(
		{
			name: "SpellSwapping",
			web3FunctionHash: cid,
			trigger: {
				type: TriggerType.TIME,
				interval: FIVE_MINUTES_MILLIS,
			},
			web3FunctionArgs: {
				execAddress: "0xdFE1a5b757523Ca6F7f049ac02151808E6A52111",
				zeroExApiBaseUrl: "https://api.0x.org",
				minimumInputAmount: "1000",
				maximumInputAmount: "10000",
				minimumOutputAmount: "100000",
				maximumSwapSlippageBips: 25,
				sellFrequencySeconds: FOUR_HOURS_SECONDS,
			},
		},
		{},
		DEVOPS_SAFE,
	);
	console.log(`to: ${to}`);
	console.log(data);
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
