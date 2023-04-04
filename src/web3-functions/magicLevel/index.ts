import ky from "ky";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";
import { SimulationUrlBuilder } from "../../utils/tenderly";

const HARVESTER_ABI = [
  "function lastExecution() external view returns(uint256)",
  "function totalRewardsBalanceAfterClaiming(address) external view returns(uint256)",
  "function run(address,uint256,address,uint256,bytes memory) external"
];

const CHAINLINK_ORACLE_ABI = [
  "function latestAnswer() external view returns (int256)"
];

const VAULT_ORACLE_ABI = [
  "function peekSpot(bytes) external view returns (uint256)",
  "function oracleImplementation() external view returns (address)",
  "function trancheVault() external view returns (address)"
];

const VAULT_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function convertToAssets(uint256) external view returns (uint256)",
];

const GELATO_PROXY = "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, storage, provider } = context;

  const testing = await context.secrets.get("TESTING") || false;
  if (testing) {
    console.log("=== Testing Mode ===");
  }

  // Retrieve Last oracle update time
  const execAddress = "0x630FC1758De85C566Bdec1D75A894794E1819d7E";

  // for reference
  const juniorVault = "0x2906ae98fdaf225a697a09158d10843a89cf0fc5";
  const mezzanineVault = "0x75adc3b980c5c73ee35ecc41bf0d8b19699501b7";
  const seniorVault = "0x0253db0dda6c063fae1e5fb28318e6dbe1c14e16";
  const juniorVaultOracle = "0x978d34a96780414c5978ab3e861b0d098b2a006c";
  const mezzanineVaultOracle = "0x4d526f103307b548227f502655f7b80796b64f52";
  const seniorVaultOracle = "0x93503ab9f3aa708b757caf3238b7673bab2e3409";

  const intervalInSeconds = 3600;
  const lvlToken = "0xB64E280e9D1B5DbEc4AcceDb2257A87b400DB149"; // LVL token
  const wbnbToken = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; // WBNB token
  const mintLpSlippageInBips = 100
  const vaultOracle = new Contract(userArgs.vaultOracle as string ?? juniorVaultOracle, VAULT_ORACLE_ABI, provider);
  const maxApyInBips = (userArgs.maxApyInBips as number) ?? 5000; // max 50% APY rewards
  const maxApyInBipsAsBN = BigNumber.from(maxApyInBips);
  const secondsInOneYear = BigNumber.from("31536000");

  const BIPS = 10_000;
  const oneE8 = BigNumber.from("100000000");
  const harvester = new Contract(execAddress, HARVESTER_ABI, provider);
  const rewardTokenOracle = new Contract("0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE", CHAINLINK_ORACLE_ABI, provider); // bnb/usd oracle
  const oracleImplementation = new Contract(await vaultOracle.oracleImplementation(), VAULT_ORACLE_ABI, provider);
  const vault = new Contract(await oracleImplementation.trancheVault(), VAULT_ABI, provider);
  const timestamp = parseInt(gelatoArgs.blockTime.toString());
  const lastTimestampStr = (await storage.get("lastTimestamp")) ?? (await harvester.lastExecution()).toString();

  console.log(`vault: ${vault.address.toString()}`);
  let lastTimestamp = parseInt(lastTimestampStr);

  if (lastTimestamp == 0 && testing) {
    lastTimestamp = timestamp - 3600; // for testing, consider 1h has passed since the last harvest
  }

  const nextUpdate = lastTimestamp + intervalInSeconds
  const considerApy = lastTimestamp > 0;

  console.log(`Next oracle update: ${nextUpdate}`);
  console.log("current timestamp", timestamp);
  console.log("last harvest timestamp", lastTimestamp);

  // Check if it's ready for a new update
  if (!testing && timestamp < nextUpdate) {
    return { canExec: false, message: `Time not elapsed` };
  } else if (testing) {
    console.log("Skipping timestamp check...");
  }

  let lvlTokenAmount;
  let wbnbTokenAmount;
  let swapData;


  try {
    lvlTokenAmount = await harvester.totalRewardsBalanceAfterClaiming(vault.address);

    // remove a small portion of expected lvl reward since this doesn't seem to give as much as expected when collecting rewards
    // around 0.1% less especially when the reward is small
    lvlTokenAmount = lvlTokenAmount.sub(
      lvlTokenAmount.mul(10).div(BIPS)
    );

    console.log("reward amount in LVL", (lvlTokenAmount.toString() as unknown as number / 1e18).toLocaleString());

  } catch (err) {
    return { canExec: false, message: `totalRewardsBalanceAfterClaiming call failed ${err.toString()}` };
  }

  try {
    const url = `https://bsc.api.0x.org/swap/v1/quote?buyToken=${wbnbToken}&sellToken=${lvlToken}&sellAmount=${lvlTokenAmount}`;
    console.log("0x api url", url);
    const response: any = await ky
      .get(url, { timeout: 5_000, retry: 0 })
      .json();
    wbnbTokenAmount = BigNumber.from(response["buyAmount"]);
    swapData = response["data"];
  } catch (err) {
    return { canExec: false, message: `Coingecko call failed` };
  }

  if (wbnbTokenAmount.gt(0)) {
    let mintLpAmount;
    try {
      const peekSpotPrice = await vaultOracle.peekSpot("0x");
      const vaultPrice = BigNumber.from("10").pow("36").div(peekSpotPrice);
      const oneLpPrice = BigNumber.from("10").pow("36").div(await vault.convertToAssets(peekSpotPrice));
      const totalSupply = await vault.totalSupply();
      const bnbPrice = await rewardTokenOracle.latestAnswer(); // assume it's 8 decimals
      const rewardTotalValue = bnbPrice.mul(wbnbTokenAmount).div(oneE8) // assume reward token is 18 decimals
      const vaultTotalValue = BigNumber.from("10").pow("18").mul(totalSupply).div(peekSpotPrice);
      const vaultTotalValueInFloat = vaultTotalValue.toString() as unknown as number / 1e18;
      const rewardTotalValueInFloat = rewardTotalValue.toString() as unknown as number / 1e18;
      const timeElapsed = timestamp - lastTimestamp;

      console.log("vault price: $", vaultPrice.toString() as unknown as number / 1e18, ", LLP price: $", oneLpPrice.toString() as unknown as number / 1e18);
      console.log("reward amount in wBNB", wbnbTokenAmount.toString(), " (", wbnbTokenAmount.toString() as unknown as number / 1e18, ")");
      console.log("wBNB price: ", `$${(bnbPrice.toString() as unknown as number / 1e8).toLocaleString()}`);
      console.log("vault total value: ", `$${(vaultTotalValueInFloat).toLocaleString()}`);
      console.log("reward total value: ", `$${(rewardTotalValueInFloat).toLocaleString()}`);
      console.log(`time elapsed since last harvest: ${timeElapsed} seconds`);

      if (considerApy) {
        const apyInBips = secondsInOneYear.mul(rewardTotalValue).mul(BigNumber.from(BIPS)).div(BigNumber.from(timeElapsed)).div(vaultTotalValue);
        console.log(`current apy: ${apyInBips.toString() as unknown as number / BIPS}`);
        console.log(`max apy: ${maxApyInBips / BIPS}`);

        if (apyInBips.gt(maxApyInBipsAsBN)) {
          console.log("apy is higher than max, using max apy");

          // calculate how much reward token should represent maxApyInBips
          wbnbTokenAmount = maxApyInBipsAsBN.mul(BigNumber.from(timeElapsed)).mul(vaultTotalValue).mul(oneE8).div(BigNumber.from(BIPS)).div(secondsInOneYear).div(bnbPrice);
          console.log(`adjusted reward token amount: ${wbnbTokenAmount.toString()}`);
        }
      } else {
        console.log("first harvest: ignoring apy for now");
      }

      // calculate how much LP token should be minted based on the amount of reward token price versus one lp price
      mintLpAmount = wbnbTokenAmount.mul(bnbPrice).div(oneLpPrice).mul(BigNumber.from("10000000000"));
    } catch (err) {
      return { canExec: false, message: `Rpc call failed, details: ${err.toString()}` };
    }

    const minAmountOut = mintLpAmount.sub(
      mintLpAmount.mul(mintLpSlippageInBips).div(BIPS)
    );
    console.log("projected lp mint amount", minAmountOut.toString());

    // function run(address vault, uint256 minLp, IERC20 tokenIn, uint256 maxAmountIn, bytes memory swapData) external
    const callData = harvester.interface.encodeFunctionData("run", [
      vault.address,
      minAmountOut,
      wbnbToken,
      wbnbTokenAmount,
      swapData
    ]);

    console.log(SimulationUrlBuilder.build(GELATO_PROXY, execAddress, 0, callData, gelatoArgs.chainId));

    await storage.set("lastTimestamp", timestamp.toString());

    return {
      canExec: true,
      callData,
    };
  }
  return { canExec: false, message: "Nothing to harvest" };
});
