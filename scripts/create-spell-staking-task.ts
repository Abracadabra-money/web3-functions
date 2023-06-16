import hre from "hardhat";
import { AutomateSDK, Web3Function } from "@gelatonetwork/automate-sdk";

const { ethers, w3f } = hre;

const main = async () => {
  const spellStakingW3f = w3f.get("spell-staking");

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const automate = new AutomateSDK(chainId, deployer);

  // Deploy Web3Function on IPFS
  console.log("Deploying Web3Function on IPFS...");
  const cid = await spellStakingW3f.deploy();
  console.log(`Web3Function IPFS CID: ${cid}`);

  {
    console.log("Creating Mainnet Task");
    const task = await automate.createBatchExecTask({
      name: "SpellStaking: Withdraw & Distribute",
      web3FunctionHash: cid,
      web3FunctionArgs: {
        // not used on mainnet
        bridgingMinMIMAmount: "0",
        altChainIntervalInSeconds: 0,

        // parameters
        treasuryPercentage: 50,
        mainnetIntervalInSeconds: 86400, // 1x a day
        distributionMinMIMAmount: "100000000000000000000",
      },
    });
    console.log(`to: ${task.tx.to}`);
    console.log(task.tx.data);
    console.log("------------------");
    console.log();
  }

  const ALTCHAIN_IDS = [250, 43114, 42161];

  for (const chainId of ALTCHAIN_IDS) {
    console.log(`Creating ChainId ${chainId} Task`);
    const { taskId, tx } = await automate.createBatchExecTask({
      name: "SpellStaking: Withdraw & Bridge",
      web3FunctionHash: cid,
      web3FunctionArgs: {
        // not used on altchain
        treasuryPercentage: 0,
        distributionMinMIMAmount: "0",
        mainnetIntervalInSeconds: 0,

        // parameters
        bridgingMinMIMAmount: "50000000000000000000", // 50 MIM require to bridge
        altChainIntervalInSeconds: 17280 // 5x a day
      },
    });

    await automate.cancelTask(taskId);

    console.log(`to: ${tx.to}`);
    console.log(tx.data);
    console.log("------------------");
    console.log();
  }
};

main()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
