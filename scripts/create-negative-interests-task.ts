import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const FIVE_MINUTE_MILLIS = 5 * 60 * 1000;

const { ethers, w3f } = hre;

const main = async () => {
	const spellNegativeInterests = w3f.get("negative-interests");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await spellNegativeInterests.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	const configs = [
		{
			name: "NegativeInterests: WBTC",
			web3FunctionArgs: {
				execAddress: "0x762d06bB0E45f5ACaEEA716336142a39376E596E",
				odosApiEndpoint: "https://api.odos.xyz",
				strategyAddress: "0x186d76147A226A51a112Bb1958e8b755ab9FD1aF",
				swapToAddress: "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3",
				intervalInSeconds: 1209600,
				rewardSwappingSlippageInBips: 200,
				maxBentoBoxAmountIncreaseInBips: 1,
				maxBentoBoxChangeAmountInBips: 1000,
				interestAdjusterType: "NONE",
				interestAdjusterParameters: "",
			},
		},
		{
			name: "NegativeInterests: WETH",
			web3FunctionArgs: {
				execAddress: "0x762d06bB0E45f5ACaEEA716336142a39376E596E",
				odosApiEndpoint: "https://api.odos.xyz",
				strategyAddress: "0xcc0d7aF1f809dD3A589756Bba36Be04D19e9C6c5",
				swapToAddress: "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3",
				intervalInSeconds: 1209600,
				rewardSwappingSlippageInBips: 200,
				maxBentoBoxAmountIncreaseInBips: 1,
				maxBentoBoxChangeAmountInBips: 1000,
				interestAdjusterType: "NONE",
				interestAdjusterParameters: "",
			},
		},
		{
			name: "NegativeInterests: CRV",
			web3FunctionArgs: {
				execAddress: "0x762d06bB0E45f5ACaEEA716336142a39376E596E",
				odosApiEndpoint: "",
				strategyAddress: "0xa5ABd043aaafF2cDb0de3De45a010F0355a1c6E7",
				swapToAddress: "",
				intervalInSeconds: 43400,
				rewardSwappingSlippageInBips: 0,
				maxBentoBoxAmountIncreaseInBips: 1,
				maxBentoBoxChangeAmountInBips: 1000,
				interestAdjusterType: "CRV_AIP_13_6",
				interestAdjusterParameters:
					"0x207763511da879a900973A5E092382117C3c1588,0x7d8dF3E4D06B0e19960c19Ee673c0823BEB90815",
			},
		},
	];

	for (const config of configs) {
		console.log(`Creating ${config.name} Task`);
		const { tx } = await automate.prepareBatchExecTask(
			{
				name: config.name,
				web3FunctionHash: cid,
				trigger: {
					type: TriggerType.TIME,
					interval: FIVE_MINUTE_MILLIS,
				},
				web3FunctionArgs: config.web3FunctionArgs,
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
