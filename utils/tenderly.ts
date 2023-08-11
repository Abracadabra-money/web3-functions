const SimulationUrlBuilder = {
    log: (froms: string[], tos: string[], values: number[], datas: string[], chainids: number[]) => {
        for (let i = 0; i < froms.length; i++) {
            const from = froms[i];
            const to = tos[i];
            const value = values[i];
            const data = datas[i];
            const chainid = chainids[i];
            console.log(`https://dashboard.tenderly.co/abracadabra/magic-internet-money/simulator/new?blockIndex=0&from=${from}&value=${value}&contractAddress=${to}&rawFunctionInput=${data}&network=${chainid}&stateOverrides=%5B%5D`);
        }
    }
};
export { SimulationUrlBuilder };