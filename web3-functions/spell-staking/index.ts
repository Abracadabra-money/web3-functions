import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract, utils } from "ethers";

// import the above using require so that it's javascript objects
const WITHDRAWER_ABI = require("./abi/CauldronFeeWithdrawer.json");
const DISTRIBUTOR_ABI = require("./abi/SpellStakingRewardDistributor.json");
const IERC20_ABI = require("./abi/IERC20.json");

interface Calldata {
  to: string;
  data: string;
}

interface Distribution {
  recipient: string;
  gas: BigNumber;
  lzChainId: BigNumber;
  fee: BigNumber;
  amount: BigNumber;
}

/////////////////////////////////////////////////////
// Constants
/////////////////////////////////////////////////////
const MAINNET_CHAIN_ID = 1;
const TREASURY_FEE_PRECISION = BigNumber.from(100);
const MSPELL_STAKING_ADDRESSES: { [chainId: number]: string } = {
  1: "0xbD2fBaf2dc95bD78Cf1cD3c5235B33D1165E6797", // Ethereum
  250: "0xa668762fb20bcd7148Db1bdb402ec06Eb6DAD569", // Fantom
  43114: "0xBd84472B31d947314fDFa2ea42460A2727F955Af", // Avalanche
  42161: "0x1DF188958A8674B5177f77667b8D173c3CdD9e51", // Arbitrum
};
const MIM_ADDRESSES: { [chainId: number]: string } = {
  1: "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3", // Ethereum
  250: "0x82f0B8B456c1A451378467398982d4834b6829c1", // Fantom
  43114: "0x130966628846BFd36ff31a822705796e8cb8C18D", // Avalanche
  42161: "0xFEa7a6a0B346362BF88A9e4A88416B77a57D6c2A", // Arbitrum
};
const SPELL_ADDRESSES: { [chainId: number]: string } = {
  1: "0x090185f2135308BaD17527004364eBcC2D37e5F6", // Ethereum
  250: "0x468003B688943977e6130F4F68F23aad939a1040", // Fantom
  43114: "0xCE1bFFBD5374Dac86a2893119683F4911a2F7814", // Avalanche
  42161: "0x3E6648C5a70A150A88bCE65F4aD4d506Fe15d2AF", // Arbitrum
};

const MAINNET_ADDRESSES = {
  withdrawer: "0x2C9f65BD1a501CB406584F5532cE57c28829B131",
  distributor: "0x953DAb0e64828972853E7faA45634620A40Fa479",
  sSpell: "0x26FA3fFFB6EfE8c1E69103aCb4044C26B9A106a9",
  treasury: "0xDF2C270f610Dc35d8fFDA5B453E74db5471E126B",
  sSpellBuyBack: "0xdFE1a5b757523Ca6F7f049ac02151808E6A52111",
};

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, multiChainProvider, gelatoArgs, storage } = context;

  console.log("ChainId", gelatoArgs.chainId);

  const distributionMinMIMAmount = BigNumber.from(
    userArgs.distributionMinMIMAmount as string
  );

  const treasuryPercentage = BigNumber.from(
    userArgs.treasuryPercentage as number
  );

  const bridgingMinMIMAmount = BigNumber.from(
    userArgs.bridgingMinMIMAmount as string
  );

  const mainnetIntervalInSeconds = userArgs.mainnetIntervalInSeconds as number;
  const altchainIntervalInSeconds = userArgs.altchainIntervalInSeconds as number;

  const timestamp = (
    await multiChainProvider.chainId(MAINNET_CHAIN_ID).getBlock("latest")
  ).timestamp;

  const WITHDRAWER_INTERFACE = new utils.Interface(WITHDRAWER_ABI);
  const DISTRIBUTOR_INTERFACE = new utils.Interface(DISTRIBUTOR_ABI);

  // same address on all chains
  const WITHDRAWER_ADDRESS = "0x2C9f65BD1a501CB406584F5532cE57c28829B131";

  // supported chains
  const ALTCHAIN_IDS = [250, 43114, 42161];
  const CHAIN_IDS = [1, ...ALTCHAIN_IDS];

  const LZ_CHAIN_IDS: { [key: number]: number } = {
    1: 101,
    250: 112,
    43114: 106,
    42161: 110,
  };

  /////////////////////////////////////////////////
  // Initialization
  /////////////////////////////////////////////////
  const info: {
    [chainId: number]: {
      withdrawer: Contract;
      spell: Contract;
      mSpellStakedAmount: BigNumber;
      sSpellStakedAmount: BigNumber;
    };
  } = {};

  CHAIN_IDS.forEach(async (chainId) => {
    const provider = multiChainProvider.chainId(chainId);

    info[chainId] = {
      withdrawer: new Contract(WITHDRAWER_ADDRESS, WITHDRAWER_ABI, provider),
      spell: new Contract(SPELL_ADDRESSES[chainId], IERC20_ABI, provider),
      mSpellStakedAmount: BigNumber.from(0),
      sSpellStakedAmount: BigNumber.from(0),
    };
  });

  const callData: Calldata[] = [];

  const mim = new Contract(
    MIM_ADDRESSES[gelatoArgs.chainId],
    IERC20_ABI,
    multiChainProvider.chainId(gelatoArgs.chainId)
  );

  // Determine the total mim amount that will be withdrawn
  const amountToWithdraw = await info[
    gelatoArgs.chainId
  ].withdrawer.callStatic.withdraw();

  // The current amount plus the amount that will be withdrawn
  let mimBalanceInDistributor = amountToWithdraw.add(
    await mim.balanceOf(info[gelatoArgs.chainId].withdrawer.address)
  );

  /////////////////////////////////////////////////
  // Per-Chain Actions
  /////////////////////////////////////////////////
  // ~~~~~~~ Mainnet ~~~~~~~
  if (gelatoArgs.chainId == MAINNET_CHAIN_ID) {
    const lastMainnetRunTimestamp = Number(await storage.get("lastMainnetRun")) ?? 0;

    const run = async () => {
      const distributorMainnet = new Contract(
        MAINNET_ADDRESSES.distributor,
        DISTRIBUTOR_ABI,
        multiChainProvider.chainId(MAINNET_CHAIN_ID)
      );

      let totalSpellStaked = BigNumber.from(0);

      // Fetch staked amounts
      await Promise.all(
        CHAIN_IDS.map(async (chainId) => {
          // mSPELL staked amount
          info[chainId].mSpellStakedAmount = await info[chainId].spell.balanceOf(
            MSPELL_STAKING_ADDRESSES[chainId]
          );

          // sSPELL staked amount (mainnet only)
          if (chainId == MAINNET_CHAIN_ID) {
            info[chainId].sSpellStakedAmount = await info[
              chainId
            ].spell.balanceOf(MAINNET_ADDRESSES.sSpell);
            totalSpellStaked = totalSpellStaked.add(
              info[chainId].sSpellStakedAmount
            );
          }

          totalSpellStaked = totalSpellStaked.add(
            info[chainId].mSpellStakedAmount
          );
        })
      );

      // Distribution
      if (mimBalanceInDistributor.gte(distributionMinMIMAmount) && timestamp) {
        const distributions: Distribution[] = [];

        const treasuryAllocation = mimBalanceInDistributor
          .mul(treasuryPercentage)
          .div(TREASURY_FEE_PRECISION);

        mimBalanceInDistributor = mimBalanceInDistributor.sub(treasuryAllocation);

        // Treasury allocation
        distributions.push({
          recipient: MAINNET_ADDRESSES.treasury,
          gas: BigNumber.from(0),
          lzChainId: BigNumber.from(0),
          fee: BigNumber.from(0),
          amount: treasuryAllocation,
        });

        // Mainnet sSpell allocation
        distributions.push({
          recipient: MAINNET_ADDRESSES.sSpellBuyBack,
          gas: BigNumber.from(0),
          lzChainId: BigNumber.from(0),
          fee: BigNumber.from(0),
          amount: mimBalanceInDistributor
            .mul(info[MAINNET_CHAIN_ID].sSpellStakedAmount)
            .div(totalSpellStaked),
        });

        // Mainnet mSpell allocation
        distributions.push({
          recipient: MSPELL_STAKING_ADDRESSES[1],
          gas: BigNumber.from(0),
          lzChainId: BigNumber.from(0),
          fee: BigNumber.from(0),
          amount: mimBalanceInDistributor
            .mul(info[MAINNET_CHAIN_ID].mSpellStakedAmount)
            .div(totalSpellStaked),
        });

        // AltChain allocations
        for (const chainId in ALTCHAIN_IDS) {
          const amountToBridge = mimBalanceInDistributor
            .mul(info[ALTCHAIN_IDS[chainId]].mSpellStakedAmount)
            .div(totalSpellStaked);

          // Estimate bridging fee
          const { fee, gas } = await distributorMainnet.estimateBridgingFee(
            amountToBridge.toString(),
            LZ_CHAIN_IDS[ALTCHAIN_IDS[chainId]],
            MSPELL_STAKING_ADDRESSES[ALTCHAIN_IDS[chainId]]
          ); // use default minDstGasLookup


          distributions.push({
            recipient: MSPELL_STAKING_ADDRESSES[ALTCHAIN_IDS[chainId]],
            gas: gas,
            lzChainId: BigNumber.from(LZ_CHAIN_IDS[ALTCHAIN_IDS[chainId]].toString()),
            fee: fee,
            amount: amountToBridge,
          });

        }


        // withdraw
        callData.push({
          to: WITHDRAWER_ADDRESS,
          data: WITHDRAWER_INTERFACE.encodeFunctionData("withdraw", []),
        });


        // distribute
        callData.push({
          to: distributorMainnet.address,
          data: DISTRIBUTOR_INTERFACE.encodeFunctionData(
            "distribute",
            distributions
          ),
        });

      } else {
        console.log(
          `Not enough MIM in distributor. Minimum amount: ${distributionMinMIMAmount.toString()}. Current amount: ${mimBalanceInDistributor.toString()}`
        );
      }
    };

    if (timestamp > lastMainnetRunTimestamp + mainnetIntervalInSeconds) {
      await run();
      await storage.set("lastMainnetRun", timestamp.toString());
    }
  }

  // ~~~~~~~ AltChains ~~~~~~~
  else {
    const lastAltChainRun = Number(await storage.get("lastAltChainRun")) ?? 0;

    const run = async () => {
      if (mimBalanceInDistributor.gte(bridgingMinMIMAmount)) {
        // Estimate bridging fee
        const { fee, gas } = await info[
          gelatoArgs.chainId
        ].withdrawer.estimateBridgingFee(mimBalanceInDistributor, 0); // use default minDstGasLookup

        // withdraw
        callData.push({
          to: WITHDRAWER_ADDRESS,
          data: WITHDRAWER_INTERFACE.encodeFunctionData("withdraw", []),
        });

        // bridge
        callData.push({
          to: WITHDRAWER_ADDRESS,
          data: WITHDRAWER_INTERFACE.encodeFunctionData("bridge", [
            mimBalanceInDistributor,
            fee,
            gas,
          ]),
        });
      } else {
        console.log(
          `Not enough MIM in distributor. Minimum amount: ${bridgingMinMIMAmount.toString()}. Current amount after withdraw: ${mimBalanceInDistributor.toString()}`
        );
      }
    };

    if (timestamp > lastAltChainRun + altchainIntervalInSeconds) {
      await run();
      await storage.set("lastAltChainRun", timestamp.toString());
    }
  }

  return {
    canExec: true,
    callData,
  };
});
