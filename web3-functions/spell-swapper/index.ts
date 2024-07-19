import {
	Web3Function,
	type Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract, utils } from "ethers";
import type { Hex } from "../../utils/types";
import { type QuoteResponse, zeroExQuote } from "../../utils/zeroEx";

const BIPS = 10_000;

const MIM_ADDRESS = "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3";
const SPELL_ADDRESS = "0x090185f2135308BaD17527004364eBcC2D37e5F6";

const TOKEN_ABI = [
	"function balanceOf(address) external view returns(uint256)",
];

const SWAPPER_ABI = ["function swapMimForSpell1Inch(address,bytes) external"];

type SpellSwapperUserArgs = {
	execAddress: Hex;
	zeroExApiBaseUrl: string;
	minimumInputAmount: string;
	maximumInputAmount: string;
	minimumOutputAmount: string;
	maximumSwapSlippageBips: number;
	sellFrequencySeconds: number;
};

Web3Function.onRun(async (context: Web3FunctionContext) => {
	const { userArgs, storage, multiChainProvider } = context;

	const provider = multiChainProvider.default();

	// Retrieve Last oracle update time
	const {
		execAddress,
		zeroExApiBaseUrl,
		minimumInputAmount,
		maximumInputAmount,
		minimumOutputAmount,
		maximumSwapSlippageBips,
		sellFrequencySeconds,
	} = userArgs as SpellSwapperUserArgs;

	if (minimumInputAmount > maximumInputAmount) {
		return {
			canExec: false,
			message:
				"Bad userArgs: minimumInputAmount is greater than maximumInputAmount",
		};
	}

	const lastTimestampStr = (await storage.get("lastTimestamp")) ?? "0";
	const lastTimestamp = Number.parseInt(lastTimestampStr);

	const apiKey = await context.secrets.get("ZEROX_API_KEY");
	if (!apiKey) {
		return { canExec: false, message: "ZEROX_API_KEY not set in secrets" };
	}

	const timestamp = Math.floor(Date.now() / 1000);

	if (timestamp < lastTimestamp + sellFrequencySeconds) {
		// Update storage to persist your current state (values must be cast to string)
		return { canExec: false, message: "Time not elapsed" };
	}

	let sellAmount: BigNumber;
	try {
		const mimContract = new Contract(MIM_ADDRESS, TOKEN_ABI, provider);
		const mimBalance: BigNumber = await mimContract.balanceOf(execAddress);
		if (mimBalance.lt(utils.parseEther(minimumInputAmount))) {
			return { canExec: false, message: "Not enough MIM" };
		}
		sellAmount = mimBalance.lte(utils.parseEther(maximumInputAmount))
			? mimBalance
			: utils.parseEther(maximumInputAmount);
	} catch (err) {
		return { canExec: false, message: "Rpc call failed" };
	}

	let quote: QuoteResponse;
	try {
		quote = await zeroExQuote({
			endpoint: zeroExApiBaseUrl,
			apiKey,
			buyToken: SPELL_ADDRESS,
			sellToken: MIM_ADDRESS,
			sellAmount,
			slippagePercentage: maximumSwapSlippageBips / BIPS,
		});
	} catch (err) {
		return { canExec: false, message: `Quote Error: ${err}` };
	}

	console.log(
		`Swap ${utils.formatEther(sellAmount)} MIM to ${utils.formatEther(quote.buyAmount)} SPELL`,
	);

	if (
		BigNumber.from(quote.buyAmount).lt(utils.parseEther(minimumOutputAmount))
	) {
		return { canExec: false, message: "Not enough SPELL received" };
	}

	const swapper = new Contract(execAddress, SWAPPER_ABI, provider);

	await storage.set("lastTimestamp", timestamp.toString());

	return {
		canExec: true,
		callData: [
			{
				to: execAddress,
				data: swapper.interface.encodeFunctionData("swapMimForSpell1Inch", [
					quote.to,
					quote.data,
				]),
			},
		],
	};
});
