import { BigNumber, Contract, type providers } from "ethers";
import ky from "ky";

import gmDataStoreAbi from "./gmDataStoreAbi";
import gmReaderAbi from "./gmReaderAbi";
import type { Hex } from "./types";

const ZERO_ADDRESS: Hex = "0x0000000000000000000000000000000000000000";

const DEPOSIT_SIGNLE_TOKEN_GAS_LIMIT_KEY: Hex =
	"0xefc0960e00ee78ec9c4ac47dfe361c3ed2dc14c6be6004a1e6593b843b045001"; // DEPOSIT_GAS_LIMIT
const ESTIMATED_GAS_FEE_BASE_AMOUNT_KEY: Hex =
	"0xb240624f82b02b1a8e07fd5d67821e9664f273e0dc86415a33c1f3f444c81db4"; // ESTIMATED_GAS_FEE_BASE_AMOUNT
const ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR_KEY: Hex =
	"0xce135f2a886cf6d862269f215b1e64498fa09cb04f90b771b163399df2a82b81"; // ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR;
const ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR_PRECISION =
	BigNumber.from(10).pow(30);
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
	marketToken: Hex;
	indexToken: Hex;
	longToken: Hex;
	shortToken: Hex;
};

export type GetMarketParameters = {
	provider: providers.Provider;
	readerAddress: Hex;
	marketAddress: Hex;
	dataStoreAddress: Hex;
};

export function getMarket({
	provider,
	readerAddress,
	marketAddress,
	dataStoreAddress,
}: GetMarketParameters): Promise<Market> {
	const readerContract = new Contract(readerAddress, gmReaderAbi, provider);
	return readerContract.getMarket(dataStoreAddress, marketAddress);
}

export type Price = {
	min: BigNumber;
	max: BigNumber;
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
	const getTokenPrice = (tokenAddress: Hex) => {
		const ticker = tickers.find(
			(ticker) =>
				ticker.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
		);
		if (ticker === undefined) {
			throw Error(`tickers does not have token: ${tokenAddress}`);
		}
		return {
			min: BigNumber.from(ticker.minPrice),
			max: BigNumber.from(ticker.maxPrice),
		};
	};
	return {
		indexTokenPrice: getTokenPrice(market.indexToken),
		longTokenPrice: getTokenPrice(market.longToken),
		shortTokenPrice: getTokenPrice(market.shortToken),
	};
}

export type getDepositAmountParameters = {
	longTokenAmount: BigNumber;
	shortTokenAmount: BigNumber;
} & GetTickersParameters &
	GetMarketParameters;

export async function getDepositAmountOut({
	longTokenAmount,
	shortTokenAmount,
	endpoint,
	provider,
	readerAddress,
	marketAddress,
	dataStoreAddress,
}: getDepositAmountParameters): Promise<BigNumber> {
	const [market, tickers] = await Promise.all([
		getMarket({ provider, readerAddress, marketAddress, dataStoreAddress }),
		getTickers({ endpoint }),
	]);
	const marketPrices = getMarketPrices({ market, tickers });

	const readerContract = new Contract(readerAddress, gmReaderAbi, provider);
	return readerContract.getDepositAmountOut(
		dataStoreAddress,
		market,
		marketPrices,
		longTokenAmount,
		shortTokenAmount,
		ZERO_ADDRESS,
	);
}

export type GasLimitParameters = {
	provider: providers.Provider;
	dataStoreAddress: Hex;
};

export function getDepositSingleTokenGasLimit({
	provider,
	dataStoreAddress,
}: GasLimitParameters): Promise<BigNumber> {
	const dataStoreContract = new Contract(
		dataStoreAddress,
		gmDataStoreAbi,
		provider,
	);
	return dataStoreContract.getUint(DEPOSIT_SIGNLE_TOKEN_GAS_LIMIT_KEY);
}

export function getSingleSwapGasLimit({
	provider,
	dataStoreAddress,
}: GasLimitParameters): Promise<BigNumber> {
	const dataStoreContract = new Contract(
		dataStoreAddress,
		gmDataStoreAbi,
		provider,
	);
	return dataStoreContract.getUint(SINGLE_SWAP_GAS_LIMIT_KEY);
}

export type GetExecutionFeeParameters = {
	provider: providers.Provider;
	dataStoreAddress: Hex;
	gasLimit: BigNumber;
	gasPrice: BigNumber;
};

export async function getExecutionFee({
	provider,
	dataStoreAddress,
	gasLimit,
	gasPrice,
}: GetExecutionFeeParameters): Promise<BigNumber> {
	const dataStoreContract = new Contract(
		dataStoreAddress,
		gmDataStoreAbi,
		provider,
	);
	const [estimatedGasFeeBaseAmount, estimatedGasFeeMultiplierFactor] =
		(await Promise.all([
			dataStoreContract.getUint(ESTIMATED_GAS_FEE_BASE_AMOUNT_KEY),
			dataStoreContract.getUint(ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR_KEY),
		])) as [BigNumber, BigNumber];
	const adjustedGasLimit = gasLimit
		.mul(estimatedGasFeeMultiplierFactor)
		.div(ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR_PRECISION)
		.add(estimatedGasFeeBaseAmount);
	return adjustedGasLimit.mul(gasPrice);
}
