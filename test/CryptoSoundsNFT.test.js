const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CryptoSoundsNFT", function () {
  let cryptoSoundsNFT;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const CryptoSoundsNFT = await ethers.getContractFactory("CryptoSoundsNFT");
    cryptoSoundsNFT = await CryptoSoundsNFT.deploy(
      "CryptoSounds",
      "CSND",
      owner.address
    );
    await cryptoSoundsNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await cryptoSoundsNFT.name()).to.equal("CryptoSounds");
      expect(await cryptoSoundsNFT.symbol()).to.equal("CSND");
    });

    it("Should set the correct owner", async function () {
      expect(await cryptoSoundsNFT.owner()).to.equal(owner.address);
    });

    it("Should set the correct default royalty", async function () {
      const royaltyInfo = await cryptoSoundsNFT.royaltyInfo(0, ethers.parseEther("1"));
      expect(royaltyInfo[0]).to.equal(owner.address);
      expect(royaltyInfo[1]).to.equal(ethers.parseEther("0.05")); // 5%
    });
  });

  describe("Minting", function () {
    const audioMetadata = {
      title: "Test Song",
      artist: "Test Artist",
      album: "Test Album",
      genre: "Electronic",
      duration: 180,
      audioFormat: "WAV",
      audioHash: "QmTestHash123",
      coverImageHash: "QmCoverHash123",
      releaseDate: Math.floor(Date.now() / 1000),
      isExplicit: false
    };

    const tokenURI = "https://ipfs.io/ipfs/QmTestMetadataHash";

    it("Should mint an audio NFT successfully", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      await expect(
        cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          audioMetadata,
          tokenURI,
          { value: mintPrice }
        )
      ).to.emit(cryptoSoundsNFT, "AudioMinted")
        .withArgs(0, addr1.address, "Test Song", "Test Artist", "QmTestHash123");

      expect(await cryptoSoundsNFT.ownerOf(0)).to.equal(addr1.address);
      expect(await cryptoSoundsNFT.balanceOf(addr1.address)).to.equal(1);
    });

    it("Should store audio metadata correctly", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        tokenURI,
        { value: mintPrice }
      );

      const storedMetadata = await cryptoSoundsNFT.getAudioMetadata(0);
      expect(storedMetadata.title).to.equal("Test Song");
      expect(storedMetadata.artist).to.equal("Test Artist");
      expect(storedMetadata.duration).to.equal(180);
      expect(storedMetadata.audioFormat).to.equal("WAV");
    });

    it("Should prevent duplicate audio hash minting", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      // First mint
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        tokenURI,
        { value: mintPrice }
      );

      // Second mint with same audio hash should fail
      await expect(
        cryptoSoundsNFT.connect(addr2).mintAudioNFT(
          addr2.address,
          audioMetadata,
          tokenURI,
          { value: mintPrice }
        )
      ).to.be.revertedWith("Audio already minted");
    });

    it("Should enforce minting limits per wallet", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      const maxMints = await cryptoSoundsNFT.maxMintsPerWallet();

      // Mint up to the limit
      for (let i = 0; i < maxMints; i++) {
        const metadata = { ...audioMetadata, audioHash: `QmTestHash${i}` };
        await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          metadata,
          tokenURI,
          { value: mintPrice }
        );
      }

      // Next mint should fail
      await expect(
        cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          { ...audioMetadata, audioHash: "QmTestHashOverLimit" },
          tokenURI,
          { value: mintPrice }
        )
      ).to.be.revertedWith("Max mints per wallet exceeded");
    });

    it("Should require sufficient payment", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      const insufficientPayment = mintPrice - ethers.parseEther("0.01");

      await expect(
        cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          audioMetadata,
          tokenURI,
          { value: insufficientPayment }
        )
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should validate required fields", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();

      // Test empty title
      await expect(
        cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          { ...audioMetadata, title: "" },
          tokenURI,
          { value: mintPrice }
        )
      ).to.be.revertedWith("Title required");

      // Test empty artist
      await expect(
        cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          { ...audioMetadata, artist: "" },
          tokenURI,
          { value: mintPrice }
        )
      ).to.be.revertedWith("Artist required");

      // Test zero duration
      await expect(
        cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          { ...audioMetadata, duration: 0 },
          tokenURI,
          { value: mintPrice }
        )
      ).to.be.revertedWith("Duration must be positive");
    });
  });

  describe("Batch Minting", function () {
    it("Should mint multiple NFTs in one transaction", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      const metadatas = [
        {
          title: "Song 1",
          artist: "Artist 1",
          album: "Album 1",
          genre: "Electronic",
          duration: 180,
          audioFormat: "WAV",
          audioHash: "QmHash1",
          coverImageHash: "QmCover1",
          releaseDate: Math.floor(Date.now() / 1000),
          isExplicit: false
        },
        {
          title: "Song 2",
          artist: "Artist 2",
          album: "Album 2",
          genre: "Rock",
          duration: 240,
          audioFormat: "MP3",
          audioHash: "QmHash2",
          coverImageHash: "QmCover2",
          releaseDate: Math.floor(Date.now() / 1000),
          isExplicit: false
        }
      ];

      const tokenURIs = [
        "https://ipfs.io/ipfs/QmMetadata1",
        "https://ipfs.io/ipfs/QmMetadata2"
      ];

      await cryptoSoundsNFT.connect(addr1).batchMintAudioNFTs(
        addr1.address,
        metadatas,
        tokenURIs,
        { value: mintPrice * 2n }
      );

      expect(await cryptoSoundsNFT.balanceOf(addr1.address)).to.equal(2);
      expect(await cryptoSoundsNFT.ownerOf(0)).to.equal(addr1.address);
      expect(await cryptoSoundsNFT.ownerOf(1)).to.equal(addr1.address);
    });
  });

  describe("Metadata Updates", function () {
    it("Should allow token owner to update metadata", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        tokenURI,
        { value: mintPrice }
      );

      const newMetadata = { ...audioMetadata, title: "Updated Title" };
      
      await expect(
        cryptoSoundsNFT.connect(addr1).updateAudioMetadata(0, newMetadata)
      ).to.emit(cryptoSoundsNFT, "AudioMetadataUpdated")
        .withArgs(0, "Updated Title", "Test Artist");

      const updatedMetadata = await cryptoSoundsNFT.getAudioMetadata(0);
      expect(updatedMetadata.title).to.equal("Updated Title");
    });

    it("Should allow contract owner to update metadata", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        tokenURI,
        { value: mintPrice }
      );

      const newMetadata = { ...audioMetadata, title: "Owner Updated Title" };
      
      await cryptoSoundsNFT.connect(owner).updateAudioMetadata(0, newMetadata);

      const updatedMetadata = await cryptoSoundsNFT.getAudioMetadata(0);
      expect(updatedMetadata.title).to.equal("Owner Updated Title");
    });

    it("Should prevent unauthorized metadata updates", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        tokenURI,
        { value: mintPrice }
      );

      const newMetadata = { ...audioMetadata, title: "Unauthorized Update" };
      
      await expect(
        cryptoSoundsNFT.connect(addr2).updateAudioMetadata(0, newMetadata)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update mint price", async function () {
      const newPrice = ethers.parseEther("0.2");
      await cryptoSoundsNFT.setMintPrice(newPrice);
      expect(await cryptoSoundsNFT.mintPrice()).to.equal(newPrice);
    });

    it("Should allow owner to update max supply", async function () {
      const newMaxSupply = 20000;
      await cryptoSoundsNFT.setMaxSupply(newMaxSupply);
      expect(await cryptoSoundsNFT.maxSupply()).to.equal(newMaxSupply);
    });

    it("Should allow owner to update max mints per wallet", async function () {
      const newMaxMints = 10;
      await cryptoSoundsNFT.setMaxMintsPerWallet(newMaxMints);
      expect(await cryptoSoundsNFT.maxMintsPerWallet()).to.equal(newMaxMints);
    });

    it("Should allow owner to pause and unpause", async function () {
      await cryptoSoundsNFT.pause();
      expect(await cryptoSoundsNFT.paused()).to.be.true;

      await cryptoSoundsNFT.unpause();
      expect(await cryptoSoundsNFT.paused()).to.be.false;
    });

    it("Should prevent minting when paused", async function () {
      await cryptoSoundsNFT.pause();
      
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      await expect(
        cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          audioMetadata,
          tokenURI,
          { value: mintPrice }
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow owner to withdraw funds", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      // Mint an NFT to generate funds
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        tokenURI,
        { value: mintPrice }
      );

      const balanceBefore = await ethers.provider.getBalance(owner.address);
      await cryptoSoundsNFT.withdraw();
      const balanceAfter = await ethers.provider.getBalance(owner.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });
  });

  describe("Royalty Functions", function () {
    it("Should allow owner to set default royalty", async function () {
      const newReceiver = addr1.address;
      const newFee = 1000; // 10%
      
      await cryptoSoundsNFT.setDefaultRoyalty(newReceiver, newFee);
      
      const royaltyInfo = await cryptoSoundsNFT.royaltyInfo(0, ethers.parseEther("1"));
      expect(royaltyInfo[0]).to.equal(newReceiver);
      expect(royaltyInfo[1]).to.equal(ethers.parseEther("0.1"));
    });

    it("Should allow owner to set token-specific royalty", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        tokenURI,
        { value: mintPrice }
      );

      const newReceiver = addr2.address;
      const newFee = 750; // 7.5%
      
      await cryptoSoundsNFT.setTokenRoyalty(0, newReceiver, newFee);
      
      const royaltyInfo = await cryptoSoundsNFT.royaltyInfo(0, ethers.parseEther("1"));
      expect(royaltyInfo[0]).to.equal(newReceiver);
      expect(royaltyInfo[1]).to.equal(ethers.parseEther("0.075"));
    });
  });

  describe("Utility Functions", function () {
    it("Should check if audio is already minted", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      expect(await cryptoSoundsNFT.isAudioMinted("QmTestHash123")).to.be.false;
      
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        tokenURI,
        { value: mintPrice }
      );
      
      expect(await cryptoSoundsNFT.isAudioMinted("QmTestHash123")).to.be.true;
    });

    it("Should get token ID by audio hash", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      expect(await cryptoSoundsNFT.getTokenIdByAudioHash("QmTestHash123")).to.equal(0);
      
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        tokenURI,
        { value: mintPrice }
      );
      
      expect(await cryptoSoundsNFT.getTokenIdByAudioHash("QmTestHash123")).to.equal(0);
    });

    it("Should return correct total supply", async function () {
      expect(await cryptoSoundsNFT.totalSupply()).to.equal(0);
      
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        tokenURI,
        { value: mintPrice }
      );
      
      expect(await cryptoSoundsNFT.totalSupply()).to.equal(1);
    });
  });
});