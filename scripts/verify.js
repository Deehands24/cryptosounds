const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verifying CryptoSounds contracts...\n");

  // Get contract addresses from command line arguments or environment
  const nftAddress = process.env.NFT_ADDRESS || process.argv[2];
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS || process.argv[3];
  const royaltyAddress = process.env.ROYALTY_ADDRESS || process.argv[4];

  if (!nftAddress || !marketplaceAddress || !royaltyAddress) {
    console.error("❌ Please provide contract addresses:");
    console.error("Usage: npx hardhat run scripts/verify.js --network <network> <nft_address> <marketplace_address> <royalty_address>");
    process.exit(1);
  }

  console.log("Contract addresses:");
  console.log("- NFT:", nftAddress);
  console.log("- Marketplace:", marketplaceAddress);
  console.log("- Royalty:", royaltyAddress);
  console.log("");

  try {
    // Verify CryptoSoundsNFT
    console.log("📄 Verifying CryptoSoundsNFT...");
    await hre.run("verify:verify", {
      address: nftAddress,
      constructorArguments: [
        "CryptoSounds", // name
        "CSND", // symbol
        process.env.ROYALTY_RECEIVER || "0x0000000000000000000000000000000000000000" // royalty receiver
      ],
    });
    console.log("✅ CryptoSoundsNFT verified");

    // Verify CryptoSoundsMarketplace
    console.log("\n🏪 Verifying CryptoSoundsMarketplace...");
    await hre.run("verify:verify", {
      address: marketplaceAddress,
      constructorArguments: [
        process.env.FEE_RECIPIENT || "0x0000000000000000000000000000000000000000" // fee recipient
      ],
    });
    console.log("✅ CryptoSoundsMarketplace verified");

    // Verify CryptoSoundsRoyalty
    console.log("\n💰 Verifying CryptoSoundsRoyalty...");
    await hre.run("verify:verify", {
      address: royaltyAddress,
      constructorArguments: [
        process.env.PLATFORM_FEE_RECIPIENT || "0x0000000000000000000000000000000000000000" // platform fee recipient
      ],
    });
    console.log("✅ CryptoSoundsRoyalty verified");

    console.log("\n🎉 All contracts verified successfully!");
    console.log("\nContract links:");
    const network = await ethers.provider.getNetwork();
    if (network.chainId === 1n) { // Ethereum mainnet
      console.log(`- NFT: https://etherscan.io/address/${nftAddress}`);
      console.log(`- Marketplace: https://etherscan.io/address/${marketplaceAddress}`);
      console.log(`- Royalty: https://etherscan.io/address/${royaltyAddress}`);
    } else if (network.chainId === 11155111n) { // Sepolia testnet
      console.log(`- NFT: https://sepolia.etherscan.io/address/${nftAddress}`);
      console.log(`- Marketplace: https://sepolia.etherscan.io/address/${marketplaceAddress}`);
      console.log(`- Royalty: https://sepolia.etherscan.io/address/${royaltyAddress}`);
    }

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });