const { ethers } = require("hardhat");

async function main() {
  console.log("🎵 CryptoSounds NFT Minting Example\n");

  // Get contract addresses from environment or command line
  const nftAddress = process.env.NFT_ADDRESS || process.argv[2];
  
  if (!nftAddress) {
    console.error("❌ Please provide NFT contract address:");
    console.error("Usage: npx hardhat run scripts/mint-example.js --network <network> <nft_address>");
    process.exit(1);
  }

  // Get the signer
  const [signer] = await ethers.getSigners();
  console.log("Minting with account:", signer.address);
  console.log("Account balance:", ethers.formatEther(await signer.provider.getBalance(signer.address)), "ETH\n");

  // Connect to the NFT contract
  const CryptoSoundsNFT = await ethers.getContractFactory("CryptoSoundsNFT");
  const nftContract = CryptoSoundsNFT.attach(nftAddress);

  // Example audio metadata
  const audioMetadata = {
    title: "Digital Dreams",
    artist: "CryptoArtist",
    album: "Blockchain Beats",
    genre: "Electronic",
    duration: 240, // 4 minutes
    audioFormat: "WAV",
    audioHash: "QmExampleAudioHash123456789", // IPFS hash
    coverImageHash: "QmExampleCoverHash987654321", // IPFS hash
    releaseDate: Math.floor(Date.now() / 1000),
    isExplicit: false
  };

  // Example token URI (IPFS metadata)
  const tokenURI = "https://ipfs.io/ipfs/QmExampleMetadataHash";

  try {
    // Check if we have enough ETH for minting
    const mintPrice = await nftContract.mintPrice();
    console.log("Mint price:", ethers.formatEther(mintPrice), "ETH");

    const balance = await signer.provider.getBalance(signer.address);
    if (balance < mintPrice) {
      console.error("❌ Insufficient balance for minting");
      process.exit(1);
    }

    // Mint the NFT
    console.log("🎨 Minting audio NFT...");
    const tx = await nftContract.mintAudioNFT(
      signer.address, // to
      audioMetadata, // metadata
      tokenURI, // tokenURI
      { value: mintPrice }
    );

    console.log("⏳ Transaction submitted:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

    // Get the token ID from the event
    const mintEvent = receipt.logs.find(log => {
      try {
        const parsed = nftContract.interface.parseLog(log);
        return parsed && parsed.name === "AudioMinted";
      } catch (e) {
        return false;
      }
    });

    if (mintEvent) {
      const parsed = nftContract.interface.parseLog(mintEvent);
      const tokenId = parsed.args.tokenId;
      console.log("🎉 NFT minted successfully!");
      console.log("Token ID:", tokenId.toString());
      console.log("Title:", parsed.args.title);
      console.log("Artist:", parsed.args.artist);
      console.log("Audio Hash:", parsed.args.audioHash);

      // Get token URI
      const tokenURIResult = await nftContract.tokenURI(tokenId);
      console.log("Token URI:", tokenURIResult);

      // Get audio metadata
      const metadata = await nftContract.getAudioMetadata(tokenId);
      console.log("\n📋 Audio Metadata:");
      console.log("- Title:", metadata.title);
      console.log("- Artist:", metadata.artist);
      console.log("- Album:", metadata.album);
      console.log("- Genre:", metadata.genre);
      console.log("- Duration:", metadata.duration, "seconds");
      console.log("- Format:", metadata.audioFormat);
      console.log("- Audio Hash:", metadata.audioHash);
      console.log("- Cover Hash:", metadata.coverImageHash);
      console.log("- Release Date:", new Date(Number(metadata.releaseDate) * 1000).toISOString());
      console.log("- Explicit:", metadata.isExplicit);
    }

  } catch (error) {
    console.error("❌ Minting failed:", error.message);
    
    if (error.message.includes("Insufficient payment")) {
      console.error("💡 Make sure you have enough ETH for the minting fee");
    } else if (error.message.includes("Max supply reached")) {
      console.error("💡 The maximum supply of NFTs has been reached");
    } else if (error.message.includes("Audio already minted")) {
      console.error("💡 This audio file has already been minted as an NFT");
    } else if (error.message.includes("Max mints per wallet exceeded")) {
      console.error("💡 You have reached the maximum number of mints per wallet");
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