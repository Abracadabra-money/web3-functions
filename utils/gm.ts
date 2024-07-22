import ky from "ky";
import type { Address, Hex, PublicClient } from "viem";

import gmDataStoreAbi from "./gmDataStoreAbi";
import { gmReaderAbi } from "./gmReaderAbi";

const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

const DEPOSIT_SIGNLE_TOKEN_GAS_LIMIT_KEY: Hex =
	"0xefc0960e00ee78ec9c4ac47dfe361c3ed2dc14c6be6004a1e6593b843b045001"; // DEPOSIT_GAS_LIMIT
const ESTIMATED_GAS_FEE_BASE_AMOUNT_KEY: Hex =
	"0xb240624f82b02b1a8e07fd5d67821e9664f273e0dc86415a33c1f3f444c81db4"; // ESTIMATED_GAS_FEE_BASE_AMOUNT
const ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR_KEY: Hex =
	"0xce135f2a886cf6d862269f215b1e64498fa09cb04f90b771b163399df2a82b81"; // ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR;
const ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR_PRECISION = 10n ** 30n;
const SINGLE_SWAP_GAS_LIMIT_KEY: Hex =
	"0x3be28fb346f7abc4a956a16d3739c8c4bfcca9385988c64bf86cdd16638c1f81"; // SINGLE_SWAP_GAS_LIMIT

export type Ticker = {
	tokenAddress: string;
	tokenSymbol: string;
	minPrice: string;
	maxPrice: string;
	updatedAt: number;
};

export type GetTickersParameters = { endpoint: string };
export async function getTickers({
	endpoint,
}: GetTickersParameters): Promise<Ticker[]> {
	const gmApi = ky.extend({
		prefixUrl: endpoint,
	});
	const tickersResponse = await gmApi.get("prices/tickers");

	if (!tickersResponse.ok) {
		throw Error(
			`failed to get prices from the GM API with ${tickersResponse.statusText}`,
		);
	}
	return tickersResponse.json<Ticker[]>();
}

export type Market = {
	marketToken: Address;
	indexToken: Address;
	longToken: Address;
	shortToken: Address;
};

export type GetMarketParameters = {
	client: PublicClient;
	readerAddress: Address;
	marketAddress: Address;
	dataStoreAddress: Address;
};

export function getMarket({
	client,
	readerAddress,
	marketAddress,
	dataStoreAddress,
}: GetMarketParameters): Promise<Market> {
	return client.readContract({
		abi: gmReaderAbi,
		address: readerAddress,
		functionName: "getMarket",
		args: [dataStoreAddress, marketAddress],
	});
}

export type Price = {
	min: bigint;
	max: bigint;
};

export type MarketPrices = {
	indexTokenPrice: Price;
	longTokenPrice: Price;
	shortTokenPrice: Price;
};

export type GetMarketPrices = {
	market: Market;
	tickers: Ticker[];
};
export function getMarketPrices({
	market,
	tickers,
}: GetMarketPrices): MarketPrices {
	const getTokenPrice = (tokenAddress: Address) => {
		const ticker = tickers.find(
			(ticker) =>
				ticker.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
		);
		if (ticker === undefined) {
			throw Error(`tickers does not have token: ${tokenAddress}`);
		}
		return {
			min: BigInt(ticker.minPrice),
			max: BigInt(ticker.maxPrice),
		};
	};
	return {
		indexTokenPrice: getTokenPrice(market.indexToken),
		longTokenPrice: getTokenPrice(market.longToken),
		shortTokenPrice: getTokenPrice(market.shortToken),
	};
}

export type getDepositAmountParameters = {
	longTokenAmount: bigint;
	shortTokenAmount: bigint;
} & GetTickersParameters &
	GetMarketParameters;

export async function getDepositAmountOut({
	longTokenAmount,
	shortTokenAmount,
	endpoint,
	client,
	readerAddress,
	marketAddress,
	dataStoreAddress,
}: getDepositAmountParameters): Promise<bigint> {
	const [market, tickers] = await Promise.all([
		getMarket({ client, readerAddress, marketAddress, dataStoreAddress }),
		getTickers({ endpoint }),
	]);
	const marketPrices = getMarketPrices({ market, tickers });

	return client.readContract({
		abi: gmReaderAbi,
		address: readerAddress,
		functionName: "getDepositAmountOut",
		args: [
			dataStoreAddress,
			market,
			marketPrices,
			longTokenAmount,
			shortTokenAmount,
			ZERO_ADDRESS,
			0, // TwoStep
			true, // includeVirtualInventoryImpact = true
		],
	});
}

export type GasLimitParameters = {
	client: PublicClient;
	dataStoreAddress: Address;
};

export function getDepositSingleTokenGasLimit({
	client,
	dataStoreAddress,
}: GasLimitParameters): Promise<bigint> {
	return client.readContract({
		abi: gmDataStoreAbi,
		address: dataStoreAddress,
		functionName: "getUint",
		args: [DEPOSIT_SIGNLE_TOKEN_GAS_LIMIT_KEY],
	});
}

export function getSingleSwapGasLimit({
	client,
	dataStoreAddress,
}: GasLimitParameters): Promise<bigint> {
	return client.readContract({
		abi: gmDataStoreAbi,
		address: dataStoreAddress,
		functionName: "getUint",
		args: [SINGLE_SWAP_GAS_LIMIT_KEY],
	});
}

export type GetExecutionFeeParameters = {
	client: PublicClient;
	dataStoreAddress: Address;
	gasLimit: bigint;
	gasPrice: bigint;
};

export async function getExecutionFee({
	client,
	dataStoreAddress,
	gasLimit,
	gasPrice,
}: GetExecutionFeeParameters): Promise<bigint> {
	const [estimatedGasFeeBaseAmount, estimatedGasFeeMultiplierFactor] =
		await Promise.all([
			client.readContract({
				abi: gmDataStoreAbi,
				address: dataStoreAddress,
				functionName: "getUint",
				args: [ESTIMATED_GAS_FEE_BASE_AMOUNT_KEY],
			}),
			client.readContract({
				abi: gmDataStoreAbi,
				address: dataStoreAddress,
				functionName: "getUint",
				args: [ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR_KEY],
			}),
		]);
	const adjustedGasLimit =
		(gasLimit * estimatedGasFeeMultiplierFactor) /
			ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR_PRECISION +
		estimatedGasFeeBaseAmount;
	return adjustedGasLimit * gasPrice;
}
