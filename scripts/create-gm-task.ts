import {
	AutomateSDK,
	type CreateBatchExecTaskOptions,
	TriggerType,
	type Web3FunctionUserArgs,
} from "@gelatonetwork/automate-sdk";
import hre from "hardhat";
import { DEVOPS_SAFE } from "../utils/constants";

const { ethers, w3f } = hre;

const EIGHT_HOURS_MILLIS = 8 * 60 * 60 * 1000;

const main = async () => {
	const gm = w3f.get("gm");

	const [deployer] = await ethers.getSigners();
	const chainId = (await ethers.provider.getNetwork()).chainId;

	const automate = new AutomateSDK(chainId, deployer);

	// Deploy Web3Function on IPFS
	console.log("Deploying Web3Function on IPFS...");
	const cid = await gm.deploy();
	console.log(`Web3Function IPFS CID: ${cid}`);

	const commonBatchTaskOptions = {
		web3FunctionHash: cid,
		trigger: {
			type: TriggerType.TIME,
			interval: EIGHT_HOURS_MILLIS,
		},
	} satisfies Partial<CreateBatchExecTaskOptions>;
	const commonWeb3FunctionArgs = {
		zeroExApiEndpoint: "https://arbitrum.api.0x.org/",
		gmApiEndpoint: "https://arbitrum-api.gmxinfra.io/",
		maxSwapSlippageBips: 100,
		maxDepositSlippageBips: 50,
		dataStoreAddress: "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8",
		gmReaderAddress: "0x5Ca84c34a381434786738735265b9f3FD814b824",
	} satisfies Partial<Web3FunctionUserArgs>;
	const configs = [
		{
			...commonBatchTaskOptions,
			name: "gmARB",
			web3FunctionArgs: {
				...commonWeb3FunctionArgs,
				execAddress: "0x892dDc36214fB833E702f53B612e2608E14EE27C",
				rewardToken: "0x912CE59144191C1204E64559FE8253a0e49E6548",
				marketInputToken: "0x912CE59144191C1204E64559FE8253a0e49E6548",
				stakingAddress: "0xAF4FDCAa6d9D5Be4Acd8FCE02fA37f72b31a74cb",
				strategyToken: "0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407",
			},
		},
		{
			...commonBatchTaskOptions,
			name: "gmBTC",
			web3FunctionArgs: {
				...commonWeb3FunctionArgs,
				execAddress: "0x0D609C455f3bBD9971e37aDF41cDb342C32Ac801",
				rewardToken: "0x912CE59144191C1204E64559FE8253a0e49E6548",
				marketInputToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
				stakingAddress: "0xeB0DeaB1099DD5A7d499b89a6f47cEF8F08c5680",
				strategyToken: "0x47c031236e19d024b42f8AE6780E44A573170703",
			},
		},
		{
			...commonBatchTaskOptions,
			name: "gmETH",
			web3FunctionArgs: {
				...commonWeb3FunctionArgs,
				execAddress: "0x60a816a7a5387D59D073d9d7441E03A278cFad30",
				rewardToken: "0x912CE59144191C1204E64559FE8253a0e49E6548",
				marketInputToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
				stakingAddress: "0xa7940dcB17214faBCE26E146613804308C01c295",
				strategyToken: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
			},
		},
		{
			...commonBatchTaskOptions,
			name: "gmLINK",
			web3FunctionArgs: {
				...commonWeb3FunctionArgs,
				execAddress: "0x3142aB041cF9Db9b1b22D9f55716e83B1eA178f1",
				rewardToken: "0x912CE59144191C1204E64559FE8253a0e49E6548",
				marketInputToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
				stakingAddress: "0x5b51f27c279aEecc8352688B69d55B533417e263",
				strategyToken: "0x7f1fa204bb700853D36994DA19F830b6Ad18455C",
			},
		},
		{
			...commonBatchTaskOptions,
			name: "gmSOL",
			web3FunctionArgs: {
				...commonWeb3FunctionArgs,
				execAddress: "0x19366CAf3991EBB48566ccde140eeeb3D514D9e5",
				rewardToken: "0x912CE59144191C1204E64559FE8253a0e49E6548",
				marketInputToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
				stakingAddress: "0x18F7cCa3D98aD96cf26DBDA1Db3Fd71e30D32d31",
				strategyToken: "0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9",
			},
		},
	] satisfies Partial<CreateBatchExecTaskOptions>[];

	for (const config of configs) {
		const { tx } = await automate.prepareBatchExecTask(config, {}, DEVOPS_SAFE);
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
