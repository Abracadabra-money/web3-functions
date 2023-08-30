import hre from "hardhat";
import { AutomateSDK } from "@gelatonetwork/automate-sdk";

const { ethers, w3f } = hre;

const main = async () => {
  const xf33dW3f = w3f.get("xf33d");

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const automate = new AutomateSDK(chainId, deployer);

  // Deploy Web3Function on IPFS
  console.log("Deploying Web3Function on IPFS...");
  const cid = await xf33dW3f.deploy();
  console.log(`Web3Function IPFS CID: ${cid}`);

  {
    console.log("Creating Arbitrum USDT -> KAVA Task");
    const task = await automate.createBatchExecTask({
      name: "",
      web3FunctionHash: cid,
      web3FunctionArgs: {
        destinationChain: 177,
        chainlinkOracle: "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7"
      },
    });
    console.log(`to: ${task.tx.to}`);
    let data = task.tx.data.replace("9a688cc56f5f4fc75eaf8fdf18f43260ae43647c", "4D0c7842cD6a04f8EDB39883Db7817160DA159C3");
    console.log(data);
    console.log("------------------");
    console.log();
  }
}

main()
  .then(() => {
    process.exit();
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
