import hre from "hardhat";
import { AutomateSDK } from "@gelatonetwork/automate-sdk";

const { ethers, w3f } = hre;

const main = async () => {
  const stargateW3f = w3f.get("stargate-v2");

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const automate = new AutomateSDK(chainId, deployer);

  // Deploy Web3Function on IPFS
  console.log("Deploying Web3Function on IPFS...");
  const cid = await stargateW3f.deploy();
  console.log(`Web3Function IPFS CID: ${cid}`);

  {
    console.log("Creating Kava Stargate-USDT Task");
    const task = await automate.createBatchExecTask({
      name: "",
      web3FunctionHash: cid,
      web3FunctionArgs: {
        execAddress: "0x86130dac04869a8201c7077270c10f3afaba1c82",
        degenBoxAddress: "0x630FC1758De85C566Bdec1D75A894794E1819d7E",
        lpAddress: "0xAad094F6A75A14417d39f04E690fC216f080A41a",
        rewardAddress: "0xc86c7C0eFbd6A49B35E8714C5f59D99De09A225b",
        underlyingAddress: "0x919C1c267BC06a7039e03fcc2eF738525769109c",
        gelatoProxyAddress: "0x4D0c7842cD6a04f8EDB39883Db7817160DA159C3",
        intervalInSeconds: 86400,
        swapSlippageBips: 50,
        targetChainId: 2222
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
