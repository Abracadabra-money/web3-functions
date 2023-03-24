import { CHAIN_ID } from "@gelatonetwork/ops-sdk";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";
import { SimulationUrlBuilder } from "../../utils/tenderly";

const HARVESTER_ABI = [
  "function lastExecution() external view returns(uint256)",
  "function totalRewardsBalanceAfterClaiming() external view returns(uint256)",
  "function run(uint256,uint256) external",
];

const LENS_ABI = [
  "function getMintedGlpFromTokenIn(address,uint256) external view returns(uint256, uint256)",
];

const REWARD_TOKEN_ORACLE_ABI = [
  "function latestAnswer() external view returns (int256)"
];

const MAGIC_GLP_ORACLE_ABI = [
  "function peekSpot(bytes) external view returns (uint256)",
  "function oracleImplementation() external view returns (address)",
  "function magicGlp() external view returns (address)"
];

const MAGIC_GLP_ABI = [
  "function totalSupply() external view returns (uint256)"
];
const GELATO_PROXY = "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3";
const DEFAULT_PARAMS_PER_CHAIN = {
  // Arbitrum
  42161: {
    execAddress: "0x919Fe3564811916BB105B921158F67FD7fA02b3F", // Harvestor contract
    lensAddress: "0xe121904194eb69e5b589b58edcbc5b74069787c3",
    rewardToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // wETH
    rewardTokenChainlinkAddress: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612", // wETH chainlink Oracle,
    magicGlpOracle: "0x4ED0935ecC03D7FcEfb059e279BCD910a02F284C"
  },
  43114: {
    execAddress: "0x05b3b96dF07B4630373aE7506e51777b547335b0",
    lensAddress: "0x1589dEFC3Abb8ac5D0e86c19Fb940874Ea788c69",
    rewardToken: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // wAVAX
    rewardTokenChainlinkAddress: "0x0A77230d17318075983913bC2145DB16C7366156", // wAVAX chainlink Oracle,
    magicGlpOracle: "0x3Cc89EA432c36c8F96731765997722192202459D"
  }
}
Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, storage, provider } = context;

  const testing = await context.secrets.get("TESTING") || false;
  if (testing) {
    console.log("=== Testing Mode ===");
  }

  // Retrieve Last oracle update time
  const execAddress = (userArgs.execAddress as string) ?? DEFAULT_PARAMS_PER_CHAIN[gelatoArgs.chainId].execAddress;
  const intervalInSeconds = 3600;
  const lensAddress = (userArgs.lensAddress as string) ?? DEFAULT_PARAMS_PER_CHAIN[gelatoArgs.chainId].lensAddress;
  const rewardToken = (userArgs.rewardToken as string) ?? DEFAULT_PARAMS_PER_CHAIN[gelatoArgs.chainId].rewardToken;
  const mintGlpSlippageInBips = (userArgs.mintGlpSlippageInBips as number) ?? 100;
  const rewardTokenChainlinkAddress = (userArgs.rewardTokenChainlinkAddress as string) ?? DEFAULT_PARAMS_PER_CHAIN[gelatoArgs.chainId].rewardTokenChainlinkAddress;
  const magicGlpOracleAddress = (userArgs.magicGlpOracleAddress as string) ?? DEFAULT_PARAMS_PER_CHAIN[gelatoArgs.chainId].magicGlpOracle;
  const maxApyInBips = (userArgs.maxRewardIncrementInBips as number) ?? 5000; // max 50% APY rewards

  const BIPS = 10_000;

  const harvester = new Contract(execAddress, HARVESTER_ABI, provider);
  const rewardTokenOracle = new Contract(rewardTokenChainlinkAddress, REWARD_TOKEN_ORACLE_ABI, provider);
  const magicGlpOracle = new Contract(magicGlpOracleAddress, MAGIC_GLP_ORACLE_ABI, provider);
  const oracleImplementation = new Contract(await magicGlpOracle.oracleImplementation(), MAGIC_GLP_ORACLE_ABI, provider);
  const magicGlp = new Contract(await oracleImplementation.magicGlp(), MAGIC_GLP_ABI, provider);

  const lastTimestampStr = (await storage.get("lastTimestamp")) ?? (await harvester.lastExecution()).toString();
  const lastTimestamp = parseInt(lastTimestampStr);

  // Check if it's ready for a new update
  const timestamp = parseInt(gelatoArgs.blockTime.toString());
  const nextUpdate = lastTimestamp + intervalInSeconds
  const considerApy = lastTimestamp > 0;

  console.log(`Next oracle update: ${nextUpdate}`);
  console.log("current timestamp", timestamp);
  console.log("last harvest timestamp", lastTimestamp);

  if (!testing && timestamp < nextUpdate) {
    return { canExec: false, message: `Time not elapsed` };
  } else {
    console.log("Skipping timestamp check...");
  }

  let rewardTokenAmount;
  let lens;
  try {
    rewardTokenAmount = BigNumber.from(
      await harvester.totalRewardsBalanceAfterClaiming()
    );
  } catch (err) {
    return { canExec: false, message: `Rpc call failed` };
  }

  if (rewardTokenAmount.gt(0)) {

    let mintGlpAmount;
    try {
      if (considerApy) {
        const peekSpotPrice = await magicGlpOracle.peekSpot("0x");
        const totalSupply = await magicGlp.totalSupply();
        const rewardPrice = await rewardTokenOracle.latestAnswer(); // assume it's 8 decimals
        const rewardTotalValue = rewardPrice.mul(rewardTokenAmount).div(BigNumber.from("100000000")) // assume reward token is 18 decimals
        const magicGlpTotalValue = BigNumber.from("10").pow("18").mul(totalSupply).div(peekSpotPrice);
        const magicGlpTotalValueInFloat = magicGlpTotalValue.toString() as unknown as number / 1e18;
        const rewardTotalValueInFloat = rewardTotalValue.toString() as unknown as number / 1e18;
        const timeElapsed = timestamp - lastTimestamp;
        const apyInBips = (31536000 * rewardTotalValueInFloat) / timeElapsed / magicGlpTotalValueInFloat * BIPS;
        const effectiveApy = Math.min(apyInBips, maxApyInBips);

        console.log("reward amount", (rewardTokenAmount.toString() as unknown as number / 1e18).toLocaleString());
        console.log("reward price: ", `$${(rewardPrice.toString() as unknown as number / 1e8).toLocaleString()}`);
        console.log("magicGLP total value: ", `$${(magicGlpTotalValueInFloat).toLocaleString()}`);
        console.log("reward total value: ", `$${(rewardTotalValueInFloat).toLocaleString()}`);
        console.log(`time elapsed since last harvest: ${timeElapsed} seconds`);
        console.log(`current apy: ${apyInBips / BIPS}`);
        console.log(`max apy: ${maxApyInBips / BIPS}`);
        console.log(`effective apy: ${effectiveApy / BIPS}`);
      }

      lens = new Contract(lensAddress, LENS_ABI, provider);
      mintGlpAmount = BigNumber.from(
        (await lens.getMintedGlpFromTokenIn(rewardToken, rewardTokenAmount.toString()))[0]
      );
      console.log("projected glp mint amount", mintGlpAmount.toString() / 1e18);
    } catch (err) {
      return { canExec: false, message: `Rpc call failed, details: ${err.toString()}` };
    }

    const minAmountOut = mintGlpAmount.sub(
      mintGlpAmount.mul(mintGlpSlippageInBips).div(BIPS)
    );

    await storage.set("lastTimestamp", timestamp.toString());

    const callData = harvester.interface.encodeFunctionData("run", [
      minAmountOut.toString(),
      rewardTokenAmount.toString()
    ]);

    console.log(SimulationUrlBuilder.build(GELATO_PROXY, execAddress, 0, callData, gelatoArgs.chainId));

    return {
      canExec: true,
      callData,
    };
  }
  return { canExec: false, message: "Nothing to harvest" };
});
