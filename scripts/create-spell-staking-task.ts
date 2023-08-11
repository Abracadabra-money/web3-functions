import hre from "hardhat";
import { AutomateSDK } from "@gelatonetwork/automate-sdk";

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

        // parameters
        treasuryPercentage: 50,
        intervalInSeconds: 201600, // 3x a week
        distributionMinMIMAmount: "100000000000000000000",
      },
    });
    console.log(`to: ${task.tx.to}`);
    let data = task.tx.data.replace("9a688cc56f5f4fc75eaf8fdf18f43260ae43647c", "4D0c7842cD6a04f8EDB39883Db7817160DA159C3");
    console.log(data);
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

        // parameters
        bridgingMinMIMAmount: "50000000000000000000", // 50 MIM require to bridge
        intervalInSeconds: 201600 // 3x a week
      },
    });

    //await automate.cancelTask(taskId);

    console.log(`to: ${tx.to}`);
    let data = tx.data.replace("9a688cc56f5f4fc75eaf8fdf18f43260ae43647c", "4D0c7842cD6a04f8EDB39883Db7817160DA159C3");
    console.log(data);
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
