import ky from "ky";
import * as R from "remeda";
import type { Address, Hex } from "viem";

export type OdosQuoteParameters<
	I extends Array<{ tokenAddress: Address; amount: bigint }>,
	O extends Array<{ tokenAddress: Address; proportion: number }>,
	C extends number,
> = {
	endpoint: string;
	chainId: C;
	inputTokens: [...I];
	outputTokens: [...O];
	userAddr: Address;
	slippageLimitPercent?: number;
	disableRFQs?: boolean;
	compact?: boolean;
	simple?: boolean;
};

export async function odosQuote<
	I extends Array<{ tokenAddress: Address; amount: bigint }>,
	O extends Array<{ tokenAddress: Address; proportion: number }>,
	C extends number,
>(quoteParameters: OdosQuoteParameters<I, O, C>) {
	const odosApi = ky.extend({
		prefixUrl: quoteParameters.endpoint,
	});

	const { inValues, pathId } = await odosApi
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
		.json<{
			inValues: { [Index in keyof I]: number };
			pathId: string;
		}>();

	const assembledQuote = await odosApi
		.post("sor/assemble", {
			json: {
				pathId,
				userAddr: quoteParameters.userAddr,
			},
		})
		.json<{
			deprecated: string | null;
			blockNumber: number;
			gasEstimate: number;
			gasEstimateValue: number;
			inputTokens: {
				[Index in keyof I]: {
					tokenAddress: Lowercase<I[Index]["tokenAddress"]>;
					amount: `${bigint}`;
				};
			};
			outputTokens: {
				[Index in keyof O]: {
					tokenAddress: Lowercase<O[Index]["tokenAddress"]>;
					amount: `${bigint}`;
				};
			};
			netOutValue: number;
			outValues: { [Index in keyof O]: `${number}` };
			transaction: {
				gas: number;
				gasPrice: number;
				value: `${bigint}`;
				to: Address;
				from: Address;
				data: Hex;
				nonce: number;
				chainId: C;
			};
			simulation: null;
		}>();

	return {
		...assembledQuote,
		inputTokens: R.map(
			assembledQuote.inputTokens,
			({ tokenAddress, amount }) => ({
				tokenAddress,
				amount: BigInt(amount),
			}),
		),
		outputTokens: R.map(
			assembledQuote.outputTokens,
			({ tokenAddress, amount }) => ({
				tokenAddress,
				amount: BigInt(amount),
			}),
		),
		inValues,
		outValues: R.map(assembledQuote.outValues, (value) => Number(value)),
		transaction: {
			...assembledQuote.transaction,
			value: BigInt(assembledQuote.transaction.value),
		},
	};
}
