import {
	Web3Function,
	type Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract, utils } from "ethers";
import { GELATO_PROXY } from "../../utils/constants";
import { LZ_CHAIN_IDS } from "../../utils/lz";
import { SimulationUrlBuilder } from "../../utils/tenderly";

// import the above using require so that it's javascript objects
const WITHDRAWER_ABI = require("./abi/CauldronFeeWithdrawer.json");
const DISTRIBUTOR_ABI = require("./abi/SpellStakingRewardDistributor.json");
const IERC20_ABI = require("./abi/IERC20.json");

interface Calldata {
	to: string;
	data: string;
}

interface Distribution {
	recipient: string;
	gas: string;
	lzChainId: string;
	fee: string;
	amount: string;
}

/////////////////////////////////////////////////////
// Constants
/////////////////////////////////////////////////////
const MAINNET_CHAIN_ID = 1;
const TREASURY_FEE_PRECISION = BigNumber.from(100);
const MSPELL_STAKING_ADDRESSES: { [chainId: number]: string } = {
	1: "0xbD2fBaf2dc95bD78Cf1cD3c5235B33D1165E6797", // Ethereum
	250: "0xa668762fb20bcd7148Db1bdb402ec06Eb6DAD569", // Fantom
	43114: "0xBd84472B31d947314fDFa2ea42460A2727F955Af", // Avalanche
	42161: "0x1DF188958A8674B5177f77667b8D173c3CdD9e51", // Arbitrum
};
const MIM_ADDRESSES: { [chainId: number]: string } = {
	1: "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3", // Ethereum
	250: "0x82f0B8B456c1A451378467398982d4834b6829c1", // Fantom
	2222: "0x471EE749bA270eb4c1165B5AD95E614947f6fCeb", // Kava
	43114: "0x130966628846BFd36ff31a822705796e8cb8C18D", // Avalanche
	42161: "0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A", // Arbitrum
	81457: "0x76DA31D7C9CbEAE102aff34D3398bC450c8374c1", // Blast
};
const SPELL_ADDRESSES: { [chainId: number]: string } = {
	1: "0x090185f2135308BaD17527004364eBcC2D37e5F6", // Ethereum
	250: "0x468003B688943977e6130F4F68F23aad939a1040", // Fantom
	43114: "0xCE1bFFBD5374Dac86a2893119683F4911a2F7814", // Avalanche
	42161: "0x3E6648C5a70A150A88bCE65F4aD4d506Fe15d2AF", // Arbitrum
};

const WITHDRAWER_ADDRESS_LEGACY =
	"0x2C9f65BD1a501CB406584F5532cE57c28829B131" as const;
const WITHDRAWER_ADDRESS_LATEST =
	"0x22d0e6A4e9b658184248f5e0BF89A0D763849544" as const;

const MAINNET_ADDRESSES = {
	withdrawer: WITHDRAWER_ADDRESS_LEGACY,
	distributor: "0x953DAb0e64828972853E7faA45634620A40Fa479",
	sSpell: "0x26FA3fFFB6EfE8c1E69103aCb4044C26B9A106a9",
	treasury: "0xDF2C270f610Dc35d8fFDA5B453E74db5471E126B",
	sSpellBuyBack: "0xdFE1a5b757523Ca6F7f049ac02151808E6A52111",
};

Web3Function.onRun(async (context: Web3FunctionContext) => {
	const { userArgs, multiChainProvider, gelatoArgs, storage } = context;

	const distributionMinMIMAmount = BigNumber.from(
		userArgs.distributionMinMIMAmount as string,
	);

	const treasuryPercentage = BigNumber.from(
		userArgs.treasuryPercentage as number,
	);

	const bridgingMinMIMAmount = BigNumber.from(
		userArgs.bridgingMinMIMAmount as string,
	);

	const intervalInSeconds = userArgs.intervalInSeconds as number;

	const timestamp = (
		await multiChainProvider.chainId(MAINNET_CHAIN_ID).getBlock("latest")
	).timestamp;

	const WITHDRAWER_INTERFACE = new utils.Interface(WITHDRAWER_ABI);
	const DISTRIBUTOR_INTERFACE = new utils.Interface(DISTRIBUTOR_ABI);

	const ALTCHAIN_IDS = [250, 2222, 43114, 42161, 81457] as const;
	const CHAIN_IDS = [1, ...ALTCHAIN_IDS] as const;

	const WITHDRAWER_ADDRESS = {
		1: WITHDRAWER_ADDRESS_LEGACY,
		250: WITHDRAWER_ADDRESS_LEGACY,
		2222: WITHDRAWER_ADDRESS_LATEST,
		42161: WITHDRAWER_ADDRESS_LEGACY,
		43114: WITHDRAWER_ADDRESS_LEGACY,
		81457: WITHDRAWER_ADDRESS_LATEST,
	} as const satisfies Record<(typeof CHAIN_IDS)[number], string>;

	/////////////////////////////////////////////////
	// Initialization
	/////////////////////////////////////////////////
	const info: {
		[chainId: number]: {
			withdrawer: Contract;
			spell: Contract | undefined;
			mSpellStakedAmount: BigNumber;
			sSpellStakedAmount: BigNumber;
		};
	} = {};

	for (const chainId of CHAIN_IDS) {
		const provider = multiChainProvider.chainId(chainId);

		info[chainId] = {
			withdrawer: new Contract(
				WITHDRAWER_ADDRESS[chainId],
				WITHDRAWER_ABI,
				provider,
			),
			spell:
				SPELL_ADDRESSES[chainId] !== undefined
					? new Contract(SPELL_ADDRESSES[chainId], IERC20_ABI, provider)
					: undefined,
			mSpellStakedAmount: BigNumber.from(0),
			sSpellStakedAmount: BigNumber.from(0),
		};
	}

	const callData: Calldata[] = [];

	const mim = new Contract(
		MIM_ADDRESSES[gelatoArgs.chainId],
		IERC20_ABI,
		multiChainProvider.chainId(gelatoArgs.chainId),
	);
	console.log(info[gelatoArgs.chainId].withdrawer.address);
	// Determine the total mim amount that will be withdrawn
	const amountToWithdraw =
		await info[gelatoArgs.chainId].withdrawer.callStatic.withdraw();

	console.log(
		"Amount to withdraw",
		(amountToWithdraw.toString() / 1e18).toLocaleString(),
		"MIM",
	);

	// The current amount plus the amount that will be withdrawn
	let mimBalanceInDistributor = amountToWithdraw.add(
		await mim.balanceOf(info[gelatoArgs.chainId].withdrawer.address),
	);

	if (gelatoArgs.chainId === MAINNET_CHAIN_ID) {
		mimBalanceInDistributor = mimBalanceInDistributor.add(
			await mim.balanceOf(MAINNET_ADDRESSES.distributor),
		);
	}

	console.log(
		`Amount to distribute: ${(mimBalanceInDistributor.toString() / 1e18).toLocaleString()} MIM`,
	);

	let lastRun = Number(await storage.get("lastRun")) ?? 0;
	lastRun = lastRun >= 0 ? lastRun : 0;

	const mainnetRun = async () => {
		const distributorMainnet = new Contract(
			MAINNET_ADDRESSES.distributor,
			DISTRIBUTOR_ABI,
			multiChainProvider.chainId(MAINNET_CHAIN_ID),
		);

		let totalSpellStaked = BigNumber.from(0);

		// Fetch staked amounts
		await Promise.all(
			CHAIN_IDS.map(async (chainId) => {
				const spellContract = info[chainId].spell;
				if (spellContract !== undefined) {
					// mSPELL staked amount
					info[chainId].mSpellStakedAmount = await spellContract.balanceOf(
						MSPELL_STAKING_ADDRESSES[chainId],
					);

					// sSPELL staked amount (mainnet only)
					if (chainId === MAINNET_CHAIN_ID) {
						info[chainId].sSpellStakedAmount = await spellContract.balanceOf(
							MAINNET_ADDRESSES.sSpell,
						);
						totalSpellStaked = totalSpellStaked.add(
							info[chainId].sSpellStakedAmount,
						);
					}

					totalSpellStaked = totalSpellStaked.add(
						info[chainId].mSpellStakedAmount,
					);
				}
			}),
		);

		// Distribution
		if (mimBalanceInDistributor.gte(distributionMinMIMAmount) && timestamp) {
			const distributions: Distribution[] = [];

			const treasuryAllocation = mimBalanceInDistributor
				.mul(treasuryPercentage)
				.div(TREASURY_FEE_PRECISION);

			mimBalanceInDistributor = mimBalanceInDistributor.sub(treasuryAllocation);

			// Treasury allocation
			distributions.push({
				recipient: MAINNET_ADDRESSES.treasury,
				gas: "0",
				lzChainId: "0",
				fee: "0",
				amount: treasuryAllocation.toString(),
			});

			// Mainnet sSpell allocation
			distributions.push({
				recipient: MAINNET_ADDRESSES.sSpellBuyBack,
				gas: "0",
				lzChainId: "0",
				fee: "0",
				amount: mimBalanceInDistributor
					.mul(info[MAINNET_CHAIN_ID].sSpellStakedAmount)
					.div(totalSpellStaked)
					.toString(),
			});

			// Mainnet mSpell allocation
			distributions.push({
				recipient: MSPELL_STAKING_ADDRESSES[1],
				gas: "0",
				lzChainId: "0",
				fee: "0",
				amount: mimBalanceInDistributor
					.mul(info[MAINNET_CHAIN_ID].mSpellStakedAmount)
					.div(totalSpellStaked)
					.toString(),
			});

			// AltChain allocations
			for (const chainId of ALTCHAIN_IDS) {
				if (info[chainId].spell !== undefined) {
					const amountToBridge = mimBalanceInDistributor
						.mul(info[chainId].mSpellStakedAmount)
						.div(totalSpellStaked);

					// Estimate bridging fee
					const { fee, gas } = await distributorMainnet.estimateBridgingFee(
						amountToBridge.toString(),
						LZ_CHAIN_IDS[chainId],
						MSPELL_STAKING_ADDRESSES[chainId],
					); // use default minDstGasLookup

					distributions.push({
						recipient: MSPELL_STAKING_ADDRESSES[chainId],
						gas: gas.toString(),
						lzChainId: LZ_CHAIN_IDS[chainId].toString(),
						fee: fee.toString(),
						amount: amountToBridge.toString(),
					});
				}
			}

			// withdraw
			callData.push({
				to: MAINNET_ADDRESSES.withdrawer,
				data: WITHDRAWER_INTERFACE.encodeFunctionData("withdraw", []),
			});

			// distribute
			callData.push({
				to: distributorMainnet.address,
				data: DISTRIBUTOR_INTERFACE.encodeFunctionData("distribute", [
					distributions,
				]),
			});
		} else {
			console.log(
				`Not enough MIM in distributor. Minimum amount: ${distributionMinMIMAmount.toString()}. Current amount: ${mimBalanceInDistributor.toString()}`,
			);
		}
	};

	const altchainRun = async () => {
		if (mimBalanceInDistributor.gte(bridgingMinMIMAmount)) {
			// Estimate bridging fee
			const { fee, gas } = await info[
				gelatoArgs.chainId
			].withdrawer.estimateBridgingFee(mimBalanceInDistributor); // use default minDstGasLookup

			// withdraw
			callData.push({
				to: WITHDRAWER_ADDRESS[
					gelatoArgs.chainId as keyof typeof WITHDRAWER_ADDRESS
				],
				data: WITHDRAWER_INTERFACE.encodeFunctionData("withdraw", []),
			});

			// bridge
			callData.push({
				to: WITHDRAWER_ADDRESS[
					gelatoArgs.chainId as keyof typeof WITHDRAWER_ADDRESS
				],
				data: WITHDRAWER_INTERFACE.encodeFunctionData("bridge", [
					mimBalanceInDistributor,
					fee,
					gas,
				]),
			});
		} else {
			console.log(
				`Not enough MIM in distributor. Minimum amount: ${bridgingMinMIMAmount.toString()}. Current amount after withdraw: ${mimBalanceInDistributor.toString()}`,
			);
		}
	};

	if (timestamp > lastRun + intervalInSeconds) {
		if (gelatoArgs.chainId === MAINNET_CHAIN_ID) {
			await mainnetRun();
		} else {
			await altchainRun();
		}
	} else {
		console.log(
			`Last run was ${timestamp - lastRun} seconds ago. Skipping run.`,
		);
	}

	// Nothing to do yet
	if (callData.length === 0) {
		return {
			canExec: false,
			callData: [],
			message: "Nothing to do",
		};
	}

	// Update last runs and execute
	await storage.set("lastRun", timestamp.toString());

	SimulationUrlBuilder.log(
		callData.map(() => GELATO_PROXY),
		callData.map(({ to }) => to),
		callData.map(() => 0),
		callData.map(({ data }) => data),
		callData.map(() => gelatoArgs.chainId),
	);

	return {
		canExec: true,
		callData,
	};
});
