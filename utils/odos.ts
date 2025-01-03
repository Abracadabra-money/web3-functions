import ky from "ky";
import * as R from "remeda";
import type { Address, Hex } from "viem";

export type OdosQuoteParameters = {
	endpoint: string;
	chainId: number;
	inputTokens: Array<{ tokenAddress: Address; amount: bigint }>;
	outputTokens: Array<{ tokenAddress: Address; proportion: number }>;
	userAddr: Address;
	slippageLimitPercent?: number;
	disableRFQs?: boolean;
	compact?: boolean;
	simple?: boolean;
};

export async function odosQuote(quoteParameters: OdosQuoteParameters) {
	const odosApi = ky.extend({
		prefixUrl: quoteParameters.endpoint,
	});

	const { pathId } = await odosApi
		.post("sor/quote/v2", {
			json: {
				...R.omit(quoteParameters, ["endpoint"]),
				inputTokens: quoteParameters.inputTokens.map(
					({ tokenAddress, amount }) => ({
						tokenAddress,
						amount: amount.toString(),
					}),
				),
			},
		})
		.json<{ pathId: string }>();

	const assembledQuote = await odosApi
		.post("sor/assemble", {
			json: {
				pathId,
				userAddr: quoteParameters.userAddr,
			},
		})
		.json<{
			blockNumber: number;
			gasEstimate: number;
			gasEstimateValue: number;
			inputTokens: Array<{ tokenAddress: Address; amount: `${bigint}` }>;
			outputTokens: Array<{ tokenAddress: Address; amount: `${bigint}` }>;
			netOutValue: number;
			outValues: number[];
			transaction: {
				gas: number;
				gasPrice: number;
				value: `${bigint}`;
				to: Address;
				from: Address;
				data: Hex;
				nonce: number;
				chainId: number;
			};
		}>();

	return {
		...assembledQuote,
		inputTokens: assembledQuote.inputTokens.map(({ tokenAddress, amount }) => ({
			tokenAddress,
			amount: BigInt(amount),
		})),
		outputTokens: assembledQuote.outputTokens.map(
			({ tokenAddress, amount }) => ({
				tokenAddress,
				amount: BigInt(amount),
			}),
		),
		transaction: {
			...assembledQuote.transaction,
			value: BigInt(assembledQuote.transaction.value),
		},
	};
}
