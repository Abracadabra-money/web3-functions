import { KyInstance } from "ky/distribution/types/ky";

export const getSwapInfo = async (api: KyInstance, tokenIn: string, tokenOut: string, chainId: number, fromAccount: string, slippageBips: number, amount: string): Promise<{ data: string, minOutAmount: string }> => {
    switch (chainId) {
        // KAVA, use openocean aggregator
        case 2222:
            let url = 'https://ethapi.openocean.finance/v2/2222/gas-price';
            let response: any = await api
                .get(url, { timeout: 10_000, retry: 0 })
                .json();

            const gasPrice = response["standard"];
            url = `https://ethapi.openocean.finance/v2/2222/swap?inTokenAddress=${tokenIn}&outTokenAddress=${tokenOut}&amount=${amount}&gasPrice=${gasPrice}&disabledDexIds=&slippage=${slippageBips}&account=${fromAccount}`;
            console.log(url);
            response = await api
                .get(url, { timeout: 10_000, retry: 0 })
                .json();
            return {
                data: response["data"],
                minOutAmount: response["minOutAmount"]
            };
        default:
            throw Error(`chainId ${chainId} not supported`);
    }
};
