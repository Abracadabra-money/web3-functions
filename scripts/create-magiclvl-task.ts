import { AutomateSDK } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";

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
		const task = await automate.createBatchExecTask({
			name: config.name,
			web3FunctionHash: cid,
			web3FunctionArgs: {
				vaultOracle: config.vaultOracle,
				maxApyInBips: 5000,
				intervalInSeconds: 86400,
			},
		});
		console.log(config.name);
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
