import {
	Web3Function,
	type Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import * as R from "remeda";
import {
	encodeFunctionData,
	erc20Abi,
	formatEther,
	parseAbi,
	parseEther,
} from "viem";
import type { Hex } from "../../utils/types";
import { createJsonRpcPublicClient } from "../../utils/viem";
import { type QuoteResponse, zeroExQuote } from "../../utils/zeroEx";

const BIPS = 10_000;

const MIM_ADDRESS = "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3";
const SPELL_ADDRESS = "0x090185f2135308BaD17527004364eBcC2D37e5F6";

const SWAPPER_ABI = parseAbi([
	"function swapMimForSpell1Inch(address,bytes) external",
]);

type SpellSwapperUserArgs = {
	execAddress: Hex;
	zeroExApiBaseUrl: string;
	minimumInputAmount: string;
	maximumInputAmount: string;
	minimumOutputAmount: string;
	maximumSwapSlippageBips: number;
	sellFrequencySeconds: number;
};

Web3Function.onRun(
	async ({
		userArgs,
		storage,
		multiChainProvider,
		secrets,
	}: Web3FunctionContext) => {
		const {
			execAddress,
			zeroExApiBaseUrl,
			minimumInputAmount,
			maximumInputAmount,
			minimumOutputAmount,
			maximumSwapSlippageBips,
			sellFrequencySeconds,
		} = userArgs as SpellSwapperUserArgs;

		const client = createJsonRpcPublicClient(multiChainProvider.default());

		// Retrieve last run timestamp and 0x api key
		const [lastTimestamp, zeroxApiKey] = await Promise.all([
			storage
				.get("lastTimestamp")
				.then((timestamp) => Number.parseInt(timestamp ?? "0")),
			secrets.get("ZEROX_API_KEY"),
		]);

		const timestamp = Math.floor(Date.now() / 1000);

		if (timestamp < lastTimestamp + sellFrequencySeconds) {
			// Update storage to persist your current state (values must be cast to string)
			return { canExec: false, message: "Time not elapsed" };
		}

		if (zeroxApiKey === undefined) {
			return {
				canExec: false,
				message: "ZEROX_API_KEY not set in secrets",
			};
		}

		let sellAmount: bigint;
		try {
			const mimBalance = await client.readContract({
				abi: erc20Abi,
				address: MIM_ADDRESS,
				functionName: "balanceOf",
				args: [execAddress],
			});
			if (mimBalance < parseEther(minimumInputAmount)) {
				return { canExec: false, message: "Not enough MIM" };
			}
			// Minimum of mimBalance and maximumInputAmount
			sellAmount = R.firstBy(
				[mimBalance, parseEther(maximumInputAmount)],
				R.identity(),
			);
		} catch (err) {
			return { canExec: false, message: "Rpc call failed" };
		}

		let quote: QuoteResponse;
		try {
			quote = await zeroExQuote({
				endpoint: zeroExApiBaseUrl,
				apiKey: zeroxApiKey,
				buyToken: SPELL_ADDRESS,
				sellToken: MIM_ADDRESS,
				sellAmount,
				slippagePercentage: maximumSwapSlippageBips / BIPS,
			});
		} catch (err) {
			return { canExec: false, message: `Quote Error: ${err}` };
		}
		const buyAmount = BigInt(quote.buyAmount);

		console.log(
			`Swap ${formatEther(sellAmount)} MIM to ${formatEther(buyAmount)} SPELL`,
		);

		if (buyAmount < BigInt(minimumOutputAmount)) {
			return { canExec: false, message: "Not enough SPELL received" };
		}

		await storage.set("lastTimestamp", timestamp.toString());

		return {
			canExec: true,
			callData: [
				{
					to: execAddress,
					data: encodeFunctionData({
						abi: SWAPPER_ABI,
						functionName: "swapMimForSpell1Inch",
						args: [quote.to, quote.data],
					}),
				},
			],
		};
	},
);
