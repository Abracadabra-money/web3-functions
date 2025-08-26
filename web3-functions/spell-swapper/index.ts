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
import { odosQuote } from "../../utils/odos";
import type { Hex } from "../../utils/types";
import { createJsonRpcPublicClient } from "../../utils/viem";

const BIPS = 10_000;

const MIM_ADDRESS = "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3";
const SPELL_ADDRESS = "0x090185f2135308BaD17527004364eBcC2D37e5F6";

const SWAPPER_ABI = parseAbi([
	"function swapMimForSpell1Inch(address,bytes) external",
]);

type SpellSwapperUserArgs = {
	execAddress: Hex;
	odosApiEndpoint: string;
	minimumInputAmount: string;
	maximumInputAmount: string;
	maximumPriceImpactBips: number;
	maximumSwapSlippageBips: number;
	sellFrequencySeconds: number;
};

Web3Function.onRun(
	async ({ userArgs, storage, multiChainProvider }: Web3FunctionContext) => {
		const {
			execAddress,
			odosApiEndpoint,
			minimumInputAmount,
			maximumInputAmount,
			maximumPriceImpactBips,
			maximumSwapSlippageBips,
			sellFrequencySeconds,
		} = userArgs as SpellSwapperUserArgs;

		const client = createJsonRpcPublicClient(multiChainProvider.default());

		// Retrieve last run timestamp and 0x api key
		const lastTimestamp = await storage
			.get("lastTimestamp")
			.then((timestamp) => Number.parseInt(timestamp ?? "0"));

		const timestamp = Math.floor(Date.now() / 1000);

		if (timestamp < lastTimestamp + sellFrequencySeconds) {
			// Update storage to persist your current state (values must be cast to string)
			return { canExec: false, message: "Time not elapsed" };
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

		let quote: Awaited<ReturnType<typeof odosQuote>>;
		try {
			quote = await odosQuote({
				endpoint: odosApiEndpoint,
				chainId: multiChainProvider.default().network.chainId,
				inputTokens: [
					{ tokenAddress: MIM_ADDRESS, amount: sellAmount },
				] as const,
				outputTokens: [{ tokenAddress: SPELL_ADDRESS, proportion: 1 }] as const,
				userAddr: execAddress,
				slippageLimitPercent: maximumSwapSlippageBips / 100,
				disableRFQs: false, // RFQ gives way deeper liquidity for SPELL
			});
		} catch (err) {
			return { canExec: false, message: `Quote Error: ${err}` };
		}

		console.log(
			`Swap ${formatEther(sellAmount)} MIM to ${formatEther(quote.outputTokens[0].amount)} SPELL`,
		);

		const priceImpactBps =
			(1 - quote.netOutValue / R.sum(quote.inValues)) * 10_000;
		if (priceImpactBps > maximumPriceImpactBips) {
			return {
				canExec: false,
				message: `Too high price impact: ${priceImpactBps} BPS`,
			};
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
						args: [quote.transaction.to, quote.transaction.data],
					}),
				},
			],
		};
	},
);
