const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Setting up CryptoSounds Royalties...\n");

  // Get contract addresses from environment or command line
  const nftAddress = process.env.NFT_ADDRESS || process.argv[2];
  const royaltyAddress = process.env.ROYALTY_ADDRESS || process.argv[3];
  const tokenId = process.argv[4] || "0";

  if (!nftAddress || !royaltyAddress) {
    console.error("❌ Please provide contract addresses:");
    console.error("Usage: npx hardhat run scripts/setup-royalties.js --network <network> <nft_address> <royalty_address> [token_id]");
    process.exit(1);
  }

  // Get the signer
  const [signer] = await ethers.getSigners();
  console.log("Setting up royalties with account:", signer.address);

  // Connect to contracts
  const CryptoSoundsNFT = await ethers.getContractFactory("CryptoSoundsNFT");
  const nftContract = CryptoSoundsNFT.attach(nftAddress);

  const CryptoSoundsRoyalty = await ethers.getContractFactory("CryptoSoundsRoyalty");
  const royaltyContract = CryptoSoundsRoyalty.attach(royaltyAddress);

  try {
    // Check if token exists
    const tokenOwner = await nftContract.ownerOf(tokenId);
    console.log(`Token ${tokenId} owner:`, tokenOwner);

    // Example royalty setup for different scenarios
    const scenarios = [
      {
        name: "Solo Artist",
        recipients: [signer.address],
        percentages: [500], // 5%
        roles: ["artist"]
      },
      {
        name: "Artist + Producer",
        recipients: [signer.address, "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"], // Example producer address
        percentages: [400, 200], // 4% + 2%
        roles: ["artist", "producer"]
      },
      {
        name: "Band + Label",
        recipients: [
          signer.address, // Lead singer
          "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6", // Guitarist
          "0x8ba1f109551bD432803012645Hac136c4c4c4c4c4", // Label
        ],
        percentages: [300, 200, 300], // 3% + 2% + 3%
        roles: ["lead_singer", "guitarist", "label"]
      }
    ];

    // Let user choose scenario or use first one
    const scenario = scenarios[0]; // Default to solo artist
    console.log(`\n🎵 Setting up royalties for: ${scenario.name}`);

    // Set up royalty recipients
    const tx = await royaltyContract.setTokenRoyalty(
      nftAddress,
      tokenId,
      scenario.recipients,
      scenario.percentages,
      scenario.roles
    );

    console.log("⏳ Transaction submitted:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Royalty setup confirmed in block:", receipt.blockNumber);

    // Display royalty information
    console.log("\n📋 Royalty Configuration:");
    console.log("========================");
    for (let i = 0; i < scenario.recipients.length; i++) {
      console.log(`${scenario.roles[i]}: ${scenario.recipients[i]} (${scenario.percentages[i] / 100}%)`);
    }

    // Get and display calculated royalties for a 1 ETH sale
    const salePrice = ethers.parseEther("1");
    const [totalRoyalty, platformFee, remaining] = await royaltyContract.calculateRoyalty(
      nftAddress,
      tokenId,
      salePrice
    );

    console.log("\n💰 Royalty Calculation (1 ETH sale):");
    console.log("===================================");
    console.log(`Total Royalty: ${ethers.formatEther(totalRoyalty)} ETH`);
    console.log(`Platform Fee: ${ethers.formatEther(platformFee)} ETH`);
    console.log(`Remaining: ${ethers.formatEther(remaining)} ETH`);

    // Test royalty distribution
    console.log("\n🧪 Testing royalty distribution...");
    const testAmount = ethers.parseEther("0.1"); // 0.1 ETH test
    
    const distributeTx = await royaltyContract.distributeRoyalties(
      nftAddress,
      tokenId,
      testAmount,
      { value: testAmount }
    );

    console.log("⏳ Distribution transaction submitted:", distributeTx.hash);
    const distributeReceipt = await distributeTx.wait();
    console.log("✅ Royalty distribution confirmed in block:", distributeReceipt.blockNumber);

    console.log("\n🎉 Royalty setup completed successfully!");

  } catch (error) {
    console.error("❌ Royalty setup failed:", error.message);
    
    if (error.message.includes("Not authorized")) {
      console.error("💡 Make sure you own the NFT or are approved to manage it");
    } else if (error.message.includes("Total percentage too high")) {
      console.error("💡 Total royalty percentage cannot exceed 10%");
    } else if (error.message.includes("Percentage too high")) {
      console.error("💡 Individual royalty percentage cannot exceed 10%");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });