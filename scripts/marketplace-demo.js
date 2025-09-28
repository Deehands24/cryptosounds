const { ethers } = require("hardhat");

async function main() {
  console.log("🏪 CryptoSounds Marketplace Demo\n");

  // Get contract addresses from environment or command line
  const nftAddress = process.env.NFT_ADDRESS || process.argv[2];
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS || process.argv[3];

  if (!nftAddress || !marketplaceAddress) {
    console.error("❌ Please provide contract addresses:");
    console.error("Usage: npx hardhat run scripts/marketplace-demo.js --network <network> <nft_address> <marketplace_address>");
    process.exit(1);
  }

  // Get signers
  const [owner, seller, buyer, bidder] = await ethers.getSigners();
  console.log("Demo participants:");
  console.log("- Owner:", owner.address);
  console.log("- Seller:", seller.address);
  console.log("- Buyer:", buyer.address);
  console.log("- Bidder:", bidder.address);
  console.log("");

  // Connect to contracts
  const CryptoSoundsNFT = await ethers.getContractFactory("CryptoSoundsNFT");
  const nftContract = CryptoSoundsNFT.attach(nftAddress);

  const CryptoSoundsMarketplace = await ethers.getContractFactory("CryptoSoundsMarketplace");
  const marketplace = CryptoSoundsMarketplace.attach(marketplaceAddress);

  try {
    // Step 1: Mint an NFT for the seller
    console.log("🎵 Step 1: Minting NFT for seller...");
    const mintPrice = await nftContract.mintPrice();
    const audioMetadata = {
      title: "Marketplace Demo Song",
      artist: "Demo Artist",
      album: "Demo Album",
      genre: "Electronic",
      duration: 180,
      audioFormat: "WAV",
      audioHash: "QmDemoHash123",
      coverImageHash: "QmDemoCover123",
      releaseDate: Math.floor(Date.now() / 1000),
      isExplicit: false
    };

    await nftContract.connect(seller).mintAudioNFT(
      seller.address,
      audioMetadata,
      "https://ipfs.io/ipfs/QmDemoMetadataHash",
      { value: mintPrice }
    );

    const tokenId = 0;
    console.log(`✅ NFT minted with token ID: ${tokenId}`);

    // Step 2: List the NFT for sale
    console.log("\n📋 Step 2: Listing NFT for sale...");
    const listingPrice = ethers.parseEther("0.5");
    const listingFee = await marketplace.listingFee();

    // Approve marketplace to transfer NFT
    await nftContract.connect(seller).approve(marketplaceAddress, tokenId);

    const listTx = await marketplace.connect(seller).listItem(
      nftAddress,
      tokenId,
      listingPrice,
      0, // no expiration
      { value: listingFee }
    );

    const listReceipt = await listTx.wait();
    const listingEvent = listReceipt.logs.find(log => {
      try {
        const parsed = marketplace.interface.parseLog(log);
        return parsed && parsed.name === "ItemListed";
      } catch (e) {
        return false;
      }
    });

    const listingId = listingEvent.args.listingId;
    console.log(`✅ NFT listed with ID: ${listingId}`);
    console.log(`   Price: ${ethers.formatEther(listingPrice)} ETH`);

    // Step 3: Make an offer
    console.log("\n💰 Step 3: Making an offer...");
    const offerAmount = ethers.parseEther("0.4");

    const offerTx = await marketplace.connect(bidder).makeOffer(
      nftAddress,
      tokenId,
      offerAmount,
      0, // no expiration
      { value: offerAmount }
    );

    const offerReceipt = await offerTx.wait();
    const offerEvent = offerReceipt.logs.find(log => {
      try {
        const parsed = marketplace.interface.parseLog(log);
        return parsed && parsed.name === "OfferMade";
      } catch (e) {
        return false;
      }
    });

    const offerId = offerEvent.args.offerId;
    console.log(`✅ Offer made with ID: ${offerId}`);
    console.log(`   Amount: ${ethers.formatEther(offerAmount)} ETH`);

    // Step 4: Buy the NFT directly
    console.log("\n🛒 Step 4: Buying NFT directly...");
    const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

    const buyTx = await marketplace.connect(buyer).buyItem(listingId, { value: listingPrice });
    const buyReceipt = await buyTx.wait();

    console.log("✅ NFT purchased successfully!");
    console.log(`   Transaction: ${buyTx.hash}`);

    // Check ownership change
    const newOwner = await nftContract.ownerOf(tokenId);
    console.log(`   New owner: ${newOwner}`);

    // Check balances
    const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);

    console.log(`   Buyer balance change: ${ethers.formatEther(buyerBalanceBefore - buyerBalanceAfter)} ETH`);
    console.log(`   Seller balance change: ${ethers.formatEther(sellerBalanceAfter - sellerBalanceBefore)} ETH`);

    // Step 5: Create an auction
    console.log("\n🔨 Step 5: Creating an auction...");
    
    // Mint another NFT for auction
    const audioMetadata2 = {
      title: "Auction Demo Song",
      artist: "Auction Artist",
      album: "Auction Album",
      genre: "Rock",
      duration: 240,
      audioFormat: "MP3",
      audioHash: "QmDemoHash456",
      coverImageHash: "QmDemoCover456",
      releaseDate: Math.floor(Date.now() / 1000),
      isExplicit: false
    };

    await nftContract.connect(seller).mintAudioNFT(
      seller.address,
      audioMetadata2,
      "https://ipfs.io/ipfs/QmDemoMetadataHash2",
      { value: mintPrice }
    );

    const auctionTokenId = 1;
    const startingPrice = ethers.parseEther("0.3");

    // Approve marketplace for auction
    await nftContract.connect(seller).approve(marketplaceAddress, auctionTokenId);

    const auctionTx = await marketplace.connect(seller).createAuction(
      nftAddress,
      auctionTokenId,
      startingPrice,
      300, // 5 minutes for demo
      { value: listingFee }
    );

    const auctionReceipt = await auctionTx.wait();
    const auctionEvent = auctionReceipt.logs.find(log => {
      try {
        const parsed = marketplace.interface.parseLog(log);
        return parsed && parsed.name === "AuctionCreated";
      } catch (e) {
        return false;
      }
    });

    const auctionId = auctionEvent.args.auctionId;
    console.log(`✅ Auction created with ID: ${auctionId}`);
    console.log(`   Starting price: ${ethers.formatEther(startingPrice)} ETH`);

    // Step 6: Place bids
    console.log("\n🎯 Step 6: Placing bids...");
    
    const bid1Amount = ethers.parseEther("0.4");
    const bid2Amount = ethers.parseEther("0.5");

    // First bid
    await marketplace.connect(buyer).placeBid(auctionId, { value: bid1Amount });
    console.log(`✅ Bid 1 placed: ${ethers.formatEther(bid1Amount)} ETH`);

    // Second bid (higher)
    await marketplace.connect(bidder).placeBid(auctionId, { value: bid2Amount });
    console.log(`✅ Bid 2 placed: ${ethers.formatEther(bid2Amount)} ETH`);

    // Step 7: End auction
    console.log("\n🏁 Step 7: Ending auction...");
    
    // Fast forward time (in a real scenario, you'd wait for the auction to end)
    await marketplace.connect(seller).endAuction(auctionId);
    
    console.log("✅ Auction ended!");
    
    // Check final ownership
    const auctionWinner = await nftContract.ownerOf(auctionTokenId);
    console.log(`   Winner: ${auctionWinner}`);

    // Display marketplace statistics
    console.log("\n📊 Marketplace Statistics:");
    console.log("=========================");
    console.log(`Total NFTs minted: ${await nftContract.totalSupply()}`);
    console.log(`Marketplace fee: ${await marketplace.marketplaceFee() / 100}%`);
    console.log(`Listing fee: ${ethers.formatEther(await marketplace.listingFee())} ETH`);

    console.log("\n🎉 Marketplace demo completed successfully!");

  } catch (error) {
    console.error("❌ Demo failed:", error.message);
    
    if (error.message.includes("Insufficient payment")) {
      console.error("💡 Make sure accounts have enough ETH for transactions");
    } else if (error.message.includes("Not the owner")) {
      console.error("💡 Make sure the correct account is trying to perform the action");
    } else if (error.message.includes("Contract not approved")) {
      console.error("💡 Make sure the marketplace is approved to transfer the NFT");
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