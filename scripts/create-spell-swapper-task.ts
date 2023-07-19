import hre from "hardhat";
import { AutomateSDK, Web3Function } from "@gelatonetwork/automate-sdk";

const { ethers, w3f } = hre;

const main = async () => {
  const spellStakingW3f = w3f.get("spell-swapper");

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
      name: "SpellSwapping",
      web3FunctionHash: cid,
      web3FunctionArgs: {
        execAddress: "0xdFE1a5b757523Ca6F7f049ac02151808E6A52111",
        zeroExApiBaseUrl: "https://api.0x.org"
      },
    });
    console.log(`to: ${task.tx.to}`);
    let data = task.tx.data.replace("9a688cc56f5f4fc75eaf8fdf18f43260ae43647c", "4D0c7842cD6a04f8EDB39883Db7817160DA159C3");
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
