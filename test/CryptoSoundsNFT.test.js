const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CryptoSoundsNFT", function () {
  let cryptoSoundsNFT;
  let audioMetadata;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy AudioMetadata contract
    const AudioMetadata = await ethers.getContractFactory("AudioMetadata");
    audioMetadata = await AudioMetadata.deploy();
    await audioMetadata.waitForDeployment();

    // Deploy CryptoSoundsNFT contract
    const CryptoSoundsNFT = await ethers.getContractFactory("CryptoSoundsNFT");
    cryptoSoundsNFT = await CryptoSoundsNFT.deploy(
      "Crypto Sounds Test",
      "CSNDT",
      owner.address
    );
    await cryptoSoundsNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await cryptoSoundsNFT.name()).to.equal("Crypto Sounds Test");
      expect(await cryptoSoundsNFT.symbol()).to.equal("CSNDT");
    });

    it("Should set the correct owner", async function () {
      expect(await cryptoSoundsNFT.owner()).to.equal(owner.address);
    });

    it("Should set the correct royalty recipient", async function () {
      expect(await cryptoSoundsNFT.royaltyRecipient()).to.equal(owner.address);
    });

    it("Should set the correct default values", async function () {
      expect(await cryptoSoundsNFT.mintPrice()).to.equal(ethers.parseEther("0.01"));
      expect(await cryptoSoundsNFT.maxSupply()).to.equal(10000);
      expect(await cryptoSoundsNFT.mintingEnabled()).to.be.true;
      expect(await cryptoSoundsNFT.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    const testMetadata = {
      title: "Test Song",
      artist: "Test Artist",
      genre: "Electronic",
      duration: 180, // 3 minutes
      audioFormat: "MP3",
      fileSize: 5000000, // 5MB
      description: "A test audio file",
      releaseDate: Math.floor(Date.now() / 1000),
      tags: ["electronic", "test"],
      explicit: false
    };

    it("Should mint an audio NFT successfully", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      await expect(
        cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          "ipfs://test-hash",
          testMetadata,
          { value: mintPrice }
        )
      ).to.emit(cryptoSoundsNFT, "AudioNFTMinted")
        .withArgs(0, addr1.address, testMetadata.title, testMetadata.artist, testMetadata.audioFormat, testMetadata.duration);

      expect(await cryptoSoundsNFT.balanceOf(addr1.address)).to.equal(1);
      expect(await cryptoSoundsNFT.ownerOf(0)).to.equal(addr1.address);
      expect(await cryptoSoundsNFT.totalSupply()).to.equal(1);
    });

    it("Should store audio metadata correctly", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        "ipfs://test-hash",
        testMetadata,
        { value: mintPrice }
      );

      const storedMetadata = await cryptoSoundsNFT.getAudioMetadata(0);
      expect(storedMetadata.title).to.equal(testMetadata.title);
      expect(storedMetadata.artist).to.equal(testMetadata.artist);
      expect(storedMetadata.duration).to.equal(testMetadata.duration);
    });

    it("Should reject minting when disabled", async function () {
      await cryptoSoundsNFT.toggleMinting();
      
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      await expect(
        cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          "ipfs://test-hash",
          testMetadata,
          { value: mintPrice }
        )
      ).to.be.revertedWith("Minting is currently disabled");
    });

    it("Should reject minting with insufficient payment", async function () {
      await expect(
        cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          "ipfs://test-hash",
          testMetadata,
          { value: ethers.parseEther("0.005") }
        )
      ).to.be.revertedWith("Insufficient payment for minting");
    });

    it("Should refund excess payment", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      const excessPayment = ethers.parseEther("0.02");
      
      const balanceBefore = await ethers.provider.getBalance(addr1.address);
      
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        "ipfs://test-hash",
        testMetadata,
        { value: excessPayment }
      );

      const balanceAfter = await ethers.provider.getBalance(addr1.address);
      const expectedBalance = balanceBefore - mintPrice;
      
      // Allow for gas costs
      expect(balanceAfter).to.be.closeTo(expectedBalance, ethers.parseEther("0.001"));
    });

    it("Should reject minting when max supply reached", async function () {
      await cryptoSoundsNFT.setMaxSupply(1);
      
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      // First mint should succeed
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        "ipfs://test-hash-1",
        testMetadata,
        { value: mintPrice }
      );

      // Second mint should fail
      await expect(
        cryptoSoundsNFT.connect(addr2).mintAudioNFT(
          addr2.address,
          "ipfs://test-hash-2",
          testMetadata,
          { value: mintPrice }
        )
      ).to.be.revertedWith("Maximum supply reached");
    });
  });

  describe("Batch Minting", function () {
    const testMetadata1 = {
      title: "Test Song 1",
      artist: "Test Artist",
      genre: "Electronic",
      duration: 180,
      audioFormat: "MP3",
      fileSize: 5000000,
      description: "First test audio file",
      releaseDate: Math.floor(Date.now() / 1000),
      tags: ["electronic", "test"],
      explicit: false
    };

    const testMetadata2 = {
      title: "Test Song 2",
      artist: "Test Artist",
      genre: "Rock",
      duration: 240,
      audioFormat: "WAV",
      fileSize: 10000000,
      description: "Second test audio file",
      releaseDate: Math.floor(Date.now() / 1000),
      tags: ["rock", "test"],
      explicit: false
    };

    it("Should batch mint multiple NFTs successfully", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      const uris = ["ipfs://test-hash-1", "ipfs://test-hash-2"];
      const metadataArray = [testMetadata1, testMetadata2];
      
      const tokenIds = await cryptoSoundsNFT.connect(addr1).batchMintAudioNFTs(
        addr1.address,
        uris,
        metadataArray,
        { value: mintPrice * 2n }
      );

      expect(tokenIds.length).to.equal(2);
      expect(await cryptoSoundsNFT.balanceOf(addr1.address)).to.equal(2);
      expect(await cryptoSoundsNFT.totalSupply()).to.equal(2);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update mint price", async function () {
      const newPrice = ethers.parseEther("0.05");
      
      await expect(cryptoSoundsNFT.setMintPrice(newPrice))
        .to.emit(cryptoSoundsNFT, "MintPriceUpdated")
        .withArgs(newPrice);

      expect(await cryptoSoundsNFT.mintPrice()).to.equal(newPrice);
    });

    it("Should allow owner to update max supply", async function () {
      const newMaxSupply = 5000;
      
      await expect(cryptoSoundsNFT.setMaxSupply(newMaxSupply))
        .to.emit(cryptoSoundsNFT, "MaxSupplyUpdated")
        .withArgs(newMaxSupply);

      expect(await cryptoSoundsNFT.maxSupply()).to.equal(newMaxSupply);
    });

    it("Should allow owner to toggle minting", async function () {
      await expect(cryptoSoundsNFT.toggleMinting())
        .to.emit(cryptoSoundsNFT, "MintingToggled")
        .withArgs(false);

      expect(await cryptoSoundsNFT.mintingEnabled()).to.be.false;

      await expect(cryptoSoundsNFT.toggleMinting())
        .to.emit(cryptoSoundsNFT, "MintingToggled")
        .withArgs(true);

      expect(await cryptoSoundsNFT.mintingEnabled()).to.be.true;
    });

    it("Should allow owner to update royalty", async function () {
      const newPercentage = 750; // 7.5%
      const newRecipient = addr1.address;
      
      await expect(cryptoSoundsNFT.updateRoyalty(newPercentage, newRecipient))
        .to.emit(cryptoSoundsNFT, "RoyaltyUpdated")
        .withArgs(newPercentage, newRecipient);

      expect(await cryptoSoundsNFT.royaltyPercentage()).to.equal(newPercentage);
      expect(await cryptoSoundsNFT.royaltyRecipient()).to.equal(newRecipient);
    });

    it("Should reject non-owner from admin functions", async function () {
      await expect(
        cryptoSoundsNFT.connect(addr1).setMintPrice(ethers.parseEther("0.05"))
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        cryptoSoundsNFT.connect(addr1).setMaxSupply(5000)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      await expect(
        cryptoSoundsNFT.connect(addr1).toggleMinting()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Royalty Information", function () {
    it("Should return correct royalty info", async function () {
      const salePrice = ethers.parseEther("1.0");
      const [recipient, royalty] = await cryptoSoundsNFT.royaltyInfo(0, salePrice);
      
      expect(recipient).to.equal(owner.address);
      expect(royalty).to.equal(ethers.parseEther("0.05")); // 5% of 1 ETH
    });
  });

  describe("Withdrawal", function () {
    it("Should allow owner to withdraw contract balance", async function () {
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      
      // Mint an NFT to add balance to contract
      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        "ipfs://test-hash",
        {
          title: "Test Song",
          artist: "Test Artist",
          genre: "Electronic",
          duration: 180,
          audioFormat: "MP3",
          fileSize: 5000000,
          description: "A test audio file",
          releaseDate: Math.floor(Date.now() / 1000),
          tags: ["electronic", "test"],
          explicit: false
        },
        { value: mintPrice }
      );

      const contractBalance = await ethers.provider.getBalance(await cryptoSoundsNFT.getAddress());
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      await cryptoSoundsNFT.withdraw();

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      // Allow for gas costs
      expect(ownerBalanceAfter).to.be.closeTo(
        ownerBalanceBefore + contractBalance,
        ethers.parseEther("0.001")
      );
    });

    it("Should reject withdrawal by non-owner", async function () {
      await expect(
        cryptoSoundsNFT.connect(addr1).withdraw()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Metadata Validation", function () {
    it("Should reject minting with empty title", async function () {
      const invalidMetadata = {
        title: "",
        artist: "Test Artist",
        genre: "Electronic",
        duration: 180,
        audioFormat: "MP3",
        fileSize: 5000000,
        description: "A test audio file",
        releaseDate: Math.floor(Date.now() / 1000),
        tags: ["electronic", "test"],
        explicit: false
      };

      const mintPrice = await cryptoSoundsNFT.mintPrice();

      await expect(
        cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          "ipfs://test-hash",
          invalidMetadata,
          { value: mintPrice }
        )
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("Should reject minting with zero duration", async function () {
      const invalidMetadata = {
        title: "Test Song",
        artist: "Test Artist",
        genre: "Electronic",
        duration: 0,
        audioFormat: "MP3",
        fileSize: 5000000,
        description: "A test audio file",
        releaseDate: Math.floor(Date.now() / 1000),
        tags: ["electronic", "test"],
        explicit: false
      };

      const mintPrice = await cryptoSoundsNFT.mintPrice();

      await expect(
        cryptoSoundsNFT.connect(addr1).mintAudioNFT(
          addr1.address,
          "ipfs://test-hash",
          invalidMetadata,
          { value: mintPrice }
        )
      ).to.be.revertedWith("Duration must be greater than 0");
    });
  });
});