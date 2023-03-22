import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";

const HARVESTER_ABI = [
  "function lastExecution() external view returns(uint256)",
  "function totalRewardsBalanceAfterClaiming() external view returns(uint256)",
  "function run(uint256) external",
];

const LENS_ABI = [
  "function glpMintAmount(address,uint256) external view returns(uint256)",
];

const REWARD_TOKEN_ORACLE_ABI = [
  "function decimals() external view returns (uint8)",
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

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, storage, provider } = context;

  // Retrieve Last oracle update time
  const execAddress =
    (userArgs.execAddress as string) ??
    "0x588d402C868aDD9053f8F0098c2DC3443c991d17";
  const intervalInSeconds = 3600;
  const lensAddress =
    (userArgs.lensAddress as string) ??
    "0x66499d9Faf67Dc1AC1B814E310e8ca97f1bc1f1a";
  const rewardToken =
    (userArgs.rewardToken as string) ??
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const mintGlpSlippageInBips =
    (userArgs.mintGlpSlippageInBips as number) ?? 100;
  const rewardTokenChainlinkAddress =
    (userArgs.rewardTokenChainlinkAddress as string) ??
    "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // wETH oracle
  const magicGlpOracleAddress =
    (userArgs.magicGlpOracleAddress as string) ??
    "0x4ED0935ecC03D7FcEfb059e279BCD910a02F284C";
  const maxRewardIncrementInBips =
    (userArgs.maxRewardIncrementInBips as number) ?? 5000; // max 50% APY rewards

  const BIPS = 10_000;

  let lastUpdated;
  const harvester = new Contract(execAddress, HARVESTER_ABI, provider);
  const rewardTokenOracle = new Contract(rewardTokenChainlinkAddress, REWARD_TOKEN_ORACLE_ABI, provider);
  const magicGlpOracle = new Contract(magicGlpOracleAddress, MAGIC_GLP_ORACLE_ABI, provider);

  const lastTimestampStr = (await storage.get("lastTimestamp")) ?? "0";
  const lastTimestamp = parseInt(lastTimestampStr);

  // Check if it's ready for a new update
  const timestamp = gelatoArgs.blockTime;
  const nextUpdate = lastTimestamp + intervalInSeconds
  console.log(`Next oracle update: ${nextUpdate}`);

  if (timestamp < nextUpdate) {
    return { canExec: false, message: `Time not elapsed` };
  }

  let rewardTokenBalance;
  let lens;
  try {
    rewardTokenBalance = BigNumber.from(
      await harvester.totalRewardsBalanceAfterClaiming()
    );
    console.log(`Last harvester update: ${lastUpdated}`);
  } catch (err) {
    return { canExec: false, message: `Rpc call failed` };
  }

  if (rewardTokenBalance.gt(0)) {

    let mintGlpAmount;
    try {
      const peekSpotPrice = await magicGlpOracle.peekSpot("0x");
      const oracleImplementation = new Contract(await magicGlpOracle.oracleImplementation(), MAGIC_GLP_ORACLE_ABI, provider);
      const totalSupply = await (new Contract(await oracleImplementation.magicGlp(), MAGIC_GLP_ABI, provider)).totalSupply();
      const magicGlpTotalValue = BigNumber.from("10").pow("18").mul(totalSupply).div(peekSpotPrice);
      console.log("magicGLP total value: ", `$${(magicGlpTotalValue.toString() as unknown as number / 1e18).toLocaleString()}`)

      lens = new Contract(lensAddress, LENS_ABI, provider);
      mintGlpAmount = BigNumber.from(
        await lens.glpMintAmount(rewardToken, rewardTokenBalance.toString())
      );
    } catch (err) {
      return { canExec: false, message: `Rpc call failed, details: ${err.toString()}` };
    }

    const minAmountOut = mintGlpAmount.sub(
      mintGlpAmount.mul(mintGlpSlippageInBips).div(BIPS)
    );

    await storage.set("lastTimestamp", timestamp.toString());

    return {
      canExec: true,
      callData: harvester.interface.encodeFunctionData("run", [
        minAmountOut.toString(),
      ]),
    };
  }
  return { canExec: false, message: "Nothing to harvest" };
});
