const { ethers } = require("hardhat");

async function main() {
  console.log("🎵 Deploying CryptoSounds NFT System...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy CryptoSoundsNFT
  console.log("📄 Deploying CryptoSoundsNFT...");
  const CryptoSoundsNFT = await ethers.getContractFactory("CryptoSoundsNFT");
  const nftContract = await CryptoSoundsNFT.deploy(
    "CryptoSounds", // name
    "CSND", // symbol
    deployer.address // royalty receiver
  );
  await nftContract.waitForDeployment();
  const nftAddress = await nftContract.getAddress();
  console.log("✅ CryptoSoundsNFT deployed to:", nftAddress);

  // Deploy CryptoSoundsMarketplace
  console.log("\n🏪 Deploying CryptoSoundsMarketplace...");
  const CryptoSoundsMarketplace = await ethers.getContractFactory("CryptoSoundsMarketplace");
  const marketplaceContract = await CryptoSoundsMarketplace.deploy(
    deployer.address // fee recipient
  );
  await marketplaceContract.waitForDeployment();
  const marketplaceAddress = await marketplaceContract.getAddress();
  console.log("✅ CryptoSoundsMarketplace deployed to:", marketplaceAddress);

  // Deploy CryptoSoundsRoyalty
  console.log("\n💰 Deploying CryptoSoundsRoyalty...");
  const CryptoSoundsRoyalty = await ethers.getContractFactory("CryptoSoundsRoyalty");
  const royaltyContract = await CryptoSoundsRoyalty.deploy(
    deployer.address // platform fee recipient
  );
  await royaltyContract.waitForDeployment();
  const royaltyAddress = await royaltyContract.getAddress();
  console.log("✅ CryptoSoundsRoyalty deployed to:", royaltyAddress);

  // Configure contracts
  console.log("\n⚙️  Configuring contracts...");
  
  // Set marketplace fee to 2.5%
  await marketplaceContract.setMarketplaceFee(250);
  console.log("✅ Marketplace fee set to 2.5%");

  // Set royalty platform fee to 0.25%
  await royaltyContract.setPlatformFee(25);
  console.log("✅ Royalty platform fee set to 0.25%");

  // Set max total royalty to 10%
  await royaltyContract.setMaxTotalPercentage(1000);
  console.log("✅ Max total royalty set to 10%");

  // Display deployment summary
  console.log("\n🎉 Deployment Summary:");
  console.log("====================");
  console.log("CryptoSoundsNFT:", nftAddress);
  console.log("CryptoSoundsMarketplace:", marketplaceAddress);
  console.log("CryptoSoundsRoyalty:", royaltyAddress);
  console.log("\n📋 Contract Configuration:");
  console.log("- NFT Name: CryptoSounds");
  console.log("- NFT Symbol: CSND");
  console.log("- Max Supply: 10,000");
  console.log("- Mint Price: 0.1 ETH");
  console.log("- Max Mints per Wallet: 5");
  console.log("- Marketplace Fee: 2.5%");
  console.log("- Platform Fee: 0.25%");
  console.log("- Max Royalty: 10%");

  // Save deployment info
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      CryptoSoundsNFT: nftAddress,
      CryptoSoundsMarketplace: marketplaceAddress,
      CryptoSoundsRoyalty: royaltyAddress
    },
    configuration: {
      nftName: "CryptoSounds",
      nftSymbol: "CSND",
      maxSupply: 10000,
      mintPrice: "0.1",
      maxMintsPerWallet: 5,
      marketplaceFee: "2.5%",
      platformFee: "0.25%",
      maxRoyalty: "10%"
    }
  };

  const fs = require('fs');
  const path = require('path');
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const networkName = (await ethers.provider.getNetwork()).name;
  const deploymentFile = path.join(deploymentsDir, `${networkName}-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

  console.log("\n🚀 CryptoSounds NFT System deployed successfully!");
  console.log("\nNext steps:");
  console.log("1. Verify contracts on Etherscan (if on mainnet/testnet)");
  console.log("2. Update frontend with contract addresses");
  console.log("3. Test the minting functionality");
  console.log("4. Configure IPFS for metadata storage");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });