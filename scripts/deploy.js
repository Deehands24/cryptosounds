const { ethers } = require("hardhat");

async function main() {
  console.log("Starting Crypto Sounds NFT deployment...");

  // Get the contract factory
  const CryptoSoundsNFT = await ethers.getContractFactory("CryptoSoundsNFT");
  const AudioMetadata = await ethers.getContractFactory("AudioMetadata");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // Deploy AudioMetadata contract first
  console.log("\nDeploying AudioMetadata contract...");
  const audioMetadata = await AudioMetadata.deploy();
  await audioMetadata.waitForDeployment();
  const audioMetadataAddress = await audioMetadata.getAddress();
  console.log("AudioMetadata deployed to:", audioMetadataAddress);

  // Deploy CryptoSoundsNFT contract
  console.log("\nDeploying CryptoSoundsNFT contract...");
  const cryptoSoundsNFT = await CryptoSoundsNFT.deploy(
    "Crypto Sounds",
    "CSND",
    deployer.address // Set deployer as royalty recipient initially
  );
  await cryptoSoundsNFT.waitForDeployment();
  const cryptoSoundsNFTAddress = await cryptoSoundsNFT.getAddress();
  console.log("CryptoSoundsNFT deployed to:", cryptoSoundsNFTAddress);

  // Verify deployment
  console.log("\nVerifying deployment...");
  const nftName = await cryptoSoundsNFT.name();
  const nftSymbol = await cryptoSoundsNFT.symbol();
  const totalSupply = await cryptoSoundsNFT.totalSupply();
  const mintPrice = await cryptoSoundsNFT.mintPrice();
  const maxSupply = await cryptoSoundsNFT.maxSupply();
  const mintingEnabled = await cryptoSoundsNFT.mintingEnabled();

  console.log("NFT Name:", nftName);
  console.log("NFT Symbol:", nftSymbol);
  console.log("Total Supply:", totalSupply.toString());
  console.log("Mint Price:", ethers.formatEther(mintPrice), "ETH");
  console.log("Max Supply:", maxSupply.toString());
  console.log("Minting Enabled:", mintingEnabled);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    contracts: {
      CryptoSoundsNFT: {
        address: cryptoSoundsNFTAddress,
        constructorArgs: ["Crypto Sounds", "CSND", deployer.address]
      },
      AudioMetadata: {
        address: audioMetadataAddress,
        constructorArgs: []
      }
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  console.log("\nDeployment completed successfully!");
  console.log("Contract addresses:");
  console.log("- CryptoSoundsNFT:", cryptoSoundsNFTAddress);
  console.log("- AudioMetadata:", audioMetadataAddress);

  // Save to file for frontend integration
  const fs = require('fs');
  fs.writeFileSync(
    './deployment.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment.json");

  // Instructions for next steps
  console.log("\nNext steps:");
  console.log("1. Verify contracts on Etherscan (if on mainnet/testnet)");
  console.log("2. Update frontend configuration with contract addresses");
  console.log("3. Test minting functionality");
  console.log("4. Set up IPFS for audio file storage");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });