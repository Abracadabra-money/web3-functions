const SimulationUrlBuilder = {
    build: (from, to, value, data, chainid,) =>
        `https://dashboard.tenderly.co/abracadabra/magic-internet-money/simulator/new?blockIndex=0&from=${from}&value=${value}&contractAddress=${to}&rawFunctionInput=${data}&network=${chainid}`
};
export { SimulationUrlBuilder };