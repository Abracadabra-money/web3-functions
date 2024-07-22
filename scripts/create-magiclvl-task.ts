import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const ONE_MINUTE_MILLIS = 60 * 1000;

const { ethers, w3f } = hre;

const main = async () => {
	const magiclvl = w3f.get("magiclvl");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await magiclvl.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	const configs = [
		{
			name: "MagicLV: Junior",
			vaultOracle: "0xDd45c6614305D705a444B3baB0405D68aC85DbA5",
		},
		{
			name: "MagicLV: Mezzanine",
			vaultOracle: "0xc2758B836Cf4eebb4712746A087b426959E1De26",
		},
		{
			name: "MagicLV: Senior",
			vaultOracle: "0x75097B761514588b7c700F71a84DDBB5AD686074",
		},
	];

	for (const config of configs) {
		const { tx } = await automate.prepareBatchExecTask(
			{
				name: config.name,
				web3FunctionHash: cid,
				trigger: {
					type: TriggerType.TIME,
					interval: ONE_MINUTE_MILLIS,
				},
				web3FunctionArgs: {
					vaultOracle: config.vaultOracle,
					maxApyInBips: 5000,
					intervalInSeconds: 86400,
				},
			},
			{},
			DEVOPS_SAFE,
		);
		console.log(config.name);
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
