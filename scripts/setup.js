const { ethers } = require("hardhat");

async function main() {
  console.log("Setting up Crypto Sounds NFT contract...");

  // Read deployment info
  const fs = require('fs');
  let deploymentInfo;
  
  try {
    deploymentInfo = JSON.parse(fs.readFileSync('./deployment.json', 'utf8'));
  } catch (error) {
    console.error("No deployment.json found. Please run deployment first.");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  const CryptoSoundsNFT = await ethers.getContractFactory("CryptoSoundsNFT");
  const contract = CryptoSoundsNFT.attach(deploymentInfo.contracts.CryptoSoundsNFT.address);

  console.log("Connected to contract at:", contract.target);
  console.log("Deployer address:", deployer.address);

  // Get current settings
  const mintPrice = await contract.mintPrice();
  const maxSupply = await contract.maxSupply();
  const mintingEnabled = await contract.mintingEnabled();
  const royaltyPercentage = await contract.royaltyPercentage();

  console.log("\nCurrent contract settings:");
  console.log("- Mint Price:", ethers.formatEther(mintPrice), "ETH");
  console.log("- Max Supply:", maxSupply.toString());
  console.log("- Minting Enabled:", mintingEnabled);
  console.log("- Royalty Percentage:", royaltyPercentage.toString(), "basis points");

  // Example: Set custom mint price (optional)
  const customMintPrice = ethers.parseEther("0.02"); // 0.02 ETH
  console.log(`\nSetting mint price to ${ethers.formatEther(customMintPrice)} ETH...`);
  
  const tx = await contract.setMintPrice(customMintPrice);
  await tx.wait();
  console.log("✅ Mint price updated");

  // Example: Set royalty to 7.5%
  const customRoyalty = 750; // 7.5% in basis points
  console.log(`\nSetting royalty to ${customRoyalty / 100}%...`);
  
  const royaltyTx = await contract.updateRoyalty(customRoyalty, deployer.address);
  await royaltyTx.wait();
  console.log("✅ Royalty updated");

  console.log("\nSetup complete!");
  console.log("Contract is ready for minting audio NFTs.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });