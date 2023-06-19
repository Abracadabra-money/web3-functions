import ky from "ky";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract } from "ethers";
import { SimulationUrlBuilder } from "../../utils/tenderly";

const HARVESTER_ABI = [
  "function lastExecution() external view returns(uint256)",
  "function run(address,uint256,address,uint256,bytes memory) external"
];

const STAKING_LENS_ABI = [
  "function pendingRewards(uint256,address) external view returns(uint256)"
]

const CHAINLINK_ORACLE_ABI = [
  "function latestAnswer() external view returns (int256)"
];

const VAULT_ORACLE_ABI = [
  "function peekSpot(bytes) external view returns (uint256)",
  "function oracleImplementation() external view returns (address)",
  "function trancheVault() external view returns (address)"
];

const IERC20_ABI = [
  "function balanceOf(address) external view returns (uint256)",
];

const VAULT_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function convertToAssets(uint256) external view returns (uint256)",
  "function asset() external view returns (address)"
];

const GELATO_PROXY = "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, storage, multiChainProvider } = context;

  // Retrieve Last oracle update time
  const execAddress = "0xa32D03497FF5C32bcfeebE6A677Dbe4A496fD918";
  const stakingLensAddress = "0x4437DB9538eb74C7418a1668766536b279C52709";
  const juniorVault = "0xC094c2a5C349eAd7839C1805126Da71Cc1cc1A39";
  const mezzanineVault = "0x87aC701ba8acb1966526375da68A692CebB8AF75";
  const seniorVault = "0xD8Cbd5b22D7D37c978609e4e394cE8B9C003993b";
  //const juniorVaultOracle = "0xDd45c6614305D705a444B3baB0405D68aC85DbA5";
  //const mezzanineVaultOracle = "0xc2758B836Cf4eebb4712746A087b426959E1De26";
  //const seniorVaultOracle = "0x75097B761514588b7c700F71a84DDBB5AD686074";

  const getStakingPid = (vault: string) => {
    switch (vault) {
      case seniorVault:
        return 0;
      case mezzanineVault:
        return 1;
      case juniorVault:
        return 2;
      default:
        throw new Error("Invalid vault address");
    }
  }

  const provider = multiChainProvider.default();
  const lvlTokensAddress = "0xB64E280e9D1B5DbEc4AcceDb2257A87b400DB149"; // LVL token
  const wbnbToken = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; // WBNB token
  const mintLpSlippageInBips = 100
  const lvlToken = new Contract(lvlTokensAddress, IERC20_ABI, provider);
  const vaultOracle = new Contract(userArgs.vaultOracle as string, VAULT_ORACLE_ABI, provider);
  const intervalInSeconds = userArgs.intervalInSeconds as number;
  const maxApyInBips = userArgs.maxApyInBips as number;
  const maxApyInBipsAsBN = BigNumber.from(maxApyInBips);
  const secondsInOneYear = BigNumber.from("31536000");

  const BIPS = 10_000;
  const oneE8 = BigNumber.from("100000000");
  const stakingLens = new Contract(stakingLensAddress, STAKING_LENS_ABI, provider);
  const harvester = new Contract(execAddress, HARVESTER_ABI, provider);
  const rewardTokenOracle = new Contract("0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE", CHAINLINK_ORACLE_ABI, provider); // bnb/usd oracle
  const oracleImplementation = new Contract(await vaultOracle.oracleImplementation(), VAULT_ORACLE_ABI, provider);
  const vault = new Contract(await oracleImplementation.trancheVault(), VAULT_ABI, provider);
  const timestamp = (
    await provider.getBlock("latest")
  ).timestamp;
  const lastTimestampStr = (await storage.get("lastTimestamp")) ?? (await harvester.lastExecution()).toString();

  console.log(`vault: ${vault.address.toString()}`);
  let lastTimestamp = parseInt(lastTimestampStr);

  const nextUpdate = lastTimestamp + intervalInSeconds
  const considerApy = lastTimestamp > 0;

  console.log(`Next oracle update: ${nextUpdate}`);
  console.log("current timestamp", timestamp);
  console.log("last harvest timestamp", lastTimestamp);

  // Check if it's ready for a new update
  if (timestamp < nextUpdate) {
    return { canExec: false, message: `Time not elapsed`, callData: [] };
  }

  let lvlTokenAmount;
  let wbnbTokenAmount;
  let swapData;

  try {
    const pid = getStakingPid(vault.address);
    lvlTokenAmount = (await stakingLens.pendingRewards(pid, vault.address)).add(await lvlToken.balanceOf(vault.address)).add(await lvlToken.balanceOf(harvester.address));
    console.log("reward amount in LVL", (lvlTokenAmount.toString() as unknown as number / 1e18).toLocaleString());

  } catch {
    return { canExec: false, message: `pendingRewards call failed`, callData: [] };
  }

  if (lvlTokenAmount.eq(0)) {
    return { canExec: false, message: `no rewards yet`, callData: [] };
  }

  try {
    const url = `https://bsc.api.0x.org/swap/v1/quote?buyToken=${wbnbToken}&sellToken=${lvlTokensAddress}&sellAmount=${lvlTokenAmount}`;
    console.log("0x api url", url);
    const response: any = await ky
      .get(url, { timeout: 5_000, retry: 0 })
      .json();
    wbnbTokenAmount = BigNumber.from(response["buyAmount"]);
    swapData = response["data"];
  } catch (err) {
    return { canExec: false, message: `0x call failed`, callData: [] };
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
      return { canExec: false, message: `Rpc call failed`, callData: [] };
    }

    const minAmountOut = mintLpAmount.sub(
      mintLpAmount.mul(mintLpSlippageInBips).div(BIPS)
    );
    console.log("projected lp mint amount", minAmountOut.toString());

    // function run(address vault, uint256 minLp, IERC20 tokenIn, uint256 maxAmountIn, bytes memory swapData) external
    const callData = [];

    ;

    callData.push({
      to: execAddress,
      data: harvester.interface.encodeFunctionData("run", [
        vault.address,
        minAmountOut,
        wbnbToken,
        wbnbTokenAmount,
        swapData
      ])
    });

    console.log(SimulationUrlBuilder.build(GELATO_PROXY, execAddress, 0, callData, gelatoArgs.chainId));

    await storage.set("lastTimestamp", timestamp.toString());

    return {
      canExec: true,
      callData
    };
  }
  return { canExec: false, message: "Nothing to harvest", callData: [] };
});
