import hre from "hardhat";
import { AutomateSDK, Web3Function } from "@gelatonetwork/automate-sdk";

const { ethers, w3f } = hre;

const main = async () => {
  const spellNegativeInterests = w3f.get("negative-interests");

  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  const automate = new AutomateSDK(chainId, deployer);

  // Deploy Web3Function on IPFS
  console.log("Deploying Web3Function on IPFS...");
  const cid = await spellNegativeInterests.deploy();
  console.log(`Web3Function IPFS CID: ${cid}`);

  const config = [
    {
      name: "NegativeInterests: WBTC",
      strategy: "0x186d76147A226A51a112Bb1958e8b755ab9FD1aF",
      zeroExApiBaseUrl: "https://api.0x.org",
    },
    {
      name: "NegativeInterests: WETH",
      strategy: "0xcc0d7aF1f809dD3A589756Bba36Be04D19e9C6c5",
      zeroExApiBaseUrl: "https://api.0x.org",
    },
    {
      name: "NegativeInterests: CRV",
      strategy: "0xa5ABd043aaafF2cDb0de3De45a010F0355a1c6E7",
      zeroExApiBaseUrl: "",
    },
  ];

  for (const { name, strategy, zeroExApiBaseUrl } of config) {
    console.log(`Creating ${name} Task`);
    const task = await automate.createBatchExecTask({
      name,
      web3FunctionHash: cid,
      web3FunctionArgs: {
        execAddress: "0x762d06bB0E45f5ACaEEA716336142a39376E596E",
        zeroExApiBaseUrl,
        strategy,
        intervalInSeconds: 86400,
        rewardSwappingSlippageInBips: 200,
        maxBentoBoxAmountIncreaseInBips: 1,
        maxBentoBoxChangeAmountInBips: 1000
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
