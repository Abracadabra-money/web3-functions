import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";

const WITHDRAWER_ABI = [
  "function getStoredPrice() public view returns (uint256)",
  "function getLivePrice() public view returns (uint256)",
  "function getPriceDeviation() external view returns (uint)",
  "function decimals() external pure returns (uint8)",
  "function updatePrice() public",
];

const DISTRIBUTOR_ABI = [
];

const 

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, multiChainProvider } = context;

  const withdrawerAddress = "0x2C9f65BD1a501CB406584F5532cE57c28829B131";
  const distributorAddress = "0x953DAb0e64828972853E7faA45634620A40Fa479";

  const withdrawers: { [chainId: number]: Contract } = {};

  const chainIds = [1, 250, 43114, 42161];

  chainIds.forEach(async (chainId) => {
    const provider = multiChainProvider.chainId(chainId);

    const withdrawer = new Contract(
      withdrawerAddress,
      WITHDRAWER_ABI,
      provider
    );
    withdrawers[chainId] = withdrawer;
  });

  const distributor = new Contract(distributorAddress, DISTRIBUTOR_ABI, multiChainProvider.chainId(1));

  const provider = multiChainProvider.chainId(1);
  const chainId = await (await provider.getNetwork()).chainId;
  const blockHeight = await provider.getBlockNumber();

  /*const oracleAddress = userArgs.oracleAddress as string;
  const oracle = new Contract(oracleAddress, ORACLE_ABI, provider);
 
  // Wrap contract with redstone data service
  const wrappedOracle = WrapperBuilder.wrap(oracle).usingDataService(
    {
      dataServiceId: "redstone-rapid-demo",
      uniqueSignersCount: 1,
      dataFeeds: ["ETH"],
      disablePayloadsDryRun: true,
    },
    ["https://d33trozg86ya9x.cloudfront.net"]
  );
 
  // Retrieve stored & live prices
  const decimals = await wrappedOracle.decimals();
  const livePrice: BigNumber = await wrappedOracle.getLivePrice();
  const storedPrice: BigNumber = await wrappedOracle.getStoredPrice();
  console.log(`Live price: ${livePrice.toString()}`);
  console.log(`Stored price: ${storedPrice.toString()}`);
 
  // Check price deviation
  const deviation: BigNumber = await wrappedOracle.getPriceDeviation();
  const deviationPrct = (deviation.toNumber() / 10 ** decimals) * 100;
  console.log(`Deviation: ${deviationPrct.toFixed(2)}%`);
 
  // Only update price if deviation is above 0.2%
  const minDeviation = 0.2;
  if (deviationPrct < minDeviation) {
    return {
      canExec: false,
      message: `No update: price deviation too small`,
    };
  }
 
  // Craft transaction to update the price on-chain
  const { data } = await wrappedOracle.populateTransaction.updatePrice();
 
  */
  return {
    canExec: true,
    callData: [
      //{ to: oracleAddress, data: data as string }
    ],
  };
});
