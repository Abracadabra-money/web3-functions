import ky from "ky";
import type { Hex } from "viem";

const ZEROX_API_KEY_HEADER_NAME = "0x-api-key";

export type QuoteParameters = {
	endpoint: string;
	apiKey: string;
	buyToken: Hex;
	sellToken: Hex;
	sellAmount: bigint;
	slippagePercentage: number;
};

export type QuoteOrder = {
	makerToken: Hex;
	takerToken: Hex;
	makerAmount: string;
	takerAmount: string;
	fillData: {
		tokenAddressPath: Hex[];
		router: Hex;
	};
	source: string;
	sourcePathId: Hex;
	type: 0 | 1 | 2 | 3;
};
export type QuoteSource = { name: string; proportion: string };

export type QuoteResponse = {
	chainId: number;
	price: string;
	guaranteedPrice: string;
	estimatedPriceImpact: string;
	to: Hex;
	data: Hex;
	value: string;
	gas: string;
	estimatedGas: string;
	gasPrice: string;
	protocolFee: string;
	minimumProtocolFee: string;
	buyAmount: string;
	grossBuyAmount: string;
	sellAmount: string;
	grossSellAmount: string;
	sources: QuoteSource[];
	buyTokenAddress: Hex;
	sellTokenAddress: Hex;
	allowanceTarget: Hex;
	order: QuoteOrder[];
	sellTokenToEthRate: string;
	buyTokenToEthRate: string;
	expectedSlippage?: string;
	fees: Record<string, unknown>;
};

export async function zeroExQuote({
	endpoint,
	apiKey,
	buyToken,
	sellToken,
	sellAmount,
	slippagePercentage,
}: QuoteParameters): Promise<QuoteResponse> {
	const zeroExApi = ky.extend({
		prefixUrl: endpoint,
		headers: {
			[ZEROX_API_KEY_HEADER_NAME]: apiKey,
		},
	});
	const quoteResponse = await zeroExApi.get("swap/v1/quote", {
		searchParams: {
			buyToken,
			sellToken,
			sellAmount: sellAmount.toString(),
			slippagePercentage,
		},
	});
	if (!quoteResponse.ok) {
		throw Error(`0x quote failed with ${quoteResponse.statusText}`);
	}
	return quoteResponse.json<QuoteResponse>();
}
