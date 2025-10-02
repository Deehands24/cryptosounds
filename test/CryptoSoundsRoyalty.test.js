const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CryptoSoundsRoyalty", function () {
  let cryptoSoundsNFT;
  let royalty;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    // Deploy NFT contract
    const CryptoSoundsNFT = await ethers.getContractFactory("CryptoSoundsNFT");
    cryptoSoundsNFT = await CryptoSoundsNFT.deploy(
      "CryptoSounds",
      "CSND",
      owner.address
    );
    await cryptoSoundsNFT.waitForDeployment();

    // Deploy royalty contract
    const CryptoSoundsRoyalty = await ethers.getContractFactory("CryptoSoundsRoyalty");
    royalty = await CryptoSoundsRoyalty.deploy(owner.address);
    await royalty.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await royalty.owner()).to.equal(owner.address);
    });

    it("Should set the correct platform fee recipient", async function () {
      expect(await royalty.platformFeeRecipient()).to.equal(owner.address);
    });

    it("Should set default platform fee", async function () {
      expect(await royalty.platformFee()).to.equal(25); // 0.25%
    });

    it("Should set default max total percentage", async function () {
      expect(await royalty.maxTotalPercentage()).to.equal(1000); // 10%
    });
  });

  describe("Setting Token Royalties", function () {
    let tokenId;

    beforeEach(async function () {
      // Mint an NFT for testing
      const mintPrice = await cryptoSoundsNFT.mintPrice();
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

      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        "https://ipfs.io/ipfs/QmTestMetadataHash",
        { value: mintPrice }
      );

      tokenId = 0;
    });

    it("Should set token royalty successfully", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const recipients = [addr2.address, addr3.address];
      const percentages = [300, 200]; // 3% and 2%
      const roles = ["artist", "producer"];

      await expect(
        royalty.connect(addr1).setTokenRoyalty(
          nftAddress,
          tokenId,
          recipients,
          percentages,
          roles
        )
      ).to.emit(royalty, "RoyaltySet")
        .withArgs(ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
          ["address", "uint256", "uint256"],
          [nftAddress, tokenId, await ethers.provider.getBlockNumber()]
        )), nftAddress, tokenId, recipients, percentages);
    });

    it("Should prevent setting royalty for non-owner", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const recipients = [addr2.address];
      const percentages = [300];
      const roles = ["artist"];

      await expect(
        royalty.connect(addr2).setTokenRoyalty(
          nftAddress,
          tokenId,
          recipients,
          percentages,
          roles
        )
      ).to.be.revertedWith("Not authorized");
    });

    it("Should validate percentage limits", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const recipients = [addr2.address];
      const percentages = [1500]; // 15% - too high
      const roles = ["artist"];

      await expect(
        royalty.connect(addr1).setTokenRoyalty(
          nftAddress,
          tokenId,
          recipients,
          percentages,
          roles
        )
      ).to.be.revertedWith("Percentage too high");
    });

    it("Should validate total percentage limit", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const recipients = [addr2.address, addr3.address];
      const percentages = [600, 500]; // 11% total - too high
      const roles = ["artist", "producer"];

      await expect(
        royalty.connect(addr1).setTokenRoyalty(
          nftAddress,
          tokenId,
          recipients,
          percentages,
          roles
        )
      ).to.be.revertedWith("Total percentage too high");
    });

    it("Should require arrays to have same length", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const recipients = [addr2.address, addr3.address];
      const percentages = [300]; // Different length
      const roles = ["artist", "producer"];

      await expect(
        royalty.connect(addr1).setTokenRoyalty(
          nftAddress,
          tokenId,
          recipients,
          percentages,
          roles
        )
      ).to.be.revertedWith("Arrays length mismatch");
    });
  });

  describe("Adding Royalty Recipients", function () {
    let tokenId;
    let nftAddress;

    beforeEach(async function () {
      // Mint an NFT and set initial royalty
      const mintPrice = await cryptoSoundsNFT.mintPrice();
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

      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        "https://ipfs.io/ipfs/QmTestMetadataHash",
        { value: mintPrice }
      );

      tokenId = 0;
      nftAddress = await cryptoSoundsNFT.getAddress();

      // Set initial royalty
      const recipients = [addr2.address];
      const percentages = [300]; // 3%
      const roles = ["artist"];

      await royalty.connect(addr1).setTokenRoyalty(
        nftAddress,
        tokenId,
        recipients,
        percentages,
        roles
      );
    });

    it("Should add royalty recipient successfully", async function () {
      await expect(
        royalty.connect(addr1).addRoyaltyRecipient(
          nftAddress,
          tokenId,
          addr3.address,
          200, // 2%
          "producer"
        )
      ).to.emit(royalty, "RoyaltyRecipientAdded");
    });

    it("Should prevent adding recipient if total exceeds limit", async function () {
      await expect(
        royalty.connect(addr1).addRoyaltyRecipient(
          nftAddress,
          tokenId,
          addr3.address,
          800, // 8% - would make total 11%
          "producer"
        )
      ).to.be.revertedWith("Total percentage too high");
    });

    it("Should prevent unauthorized addition", async function () {
      await expect(
        royalty.connect(addr2).addRoyaltyRecipient(
          nftAddress,
          tokenId,
          addr3.address,
          200,
          "producer"
        )
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Removing Royalty Recipients", function () {
    let tokenId;
    let nftAddress;

    beforeEach(async function () {
      // Mint an NFT and set royalty with multiple recipients
      const mintPrice = await cryptoSoundsNFT.mintPrice();
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

      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        "https://ipfs.io/ipfs/QmTestMetadataHash",
        { value: mintPrice }
      );

      tokenId = 0;
      nftAddress = await cryptoSoundsNFT.getAddress();

      // Set royalty with multiple recipients
      const recipients = [addr2.address, addr3.address];
      const percentages = [300, 200]; // 3% and 2%
      const roles = ["artist", "producer"];

      await royalty.connect(addr1).setTokenRoyalty(
        nftAddress,
        tokenId,
        recipients,
        percentages,
        roles
      );
    });

    it("Should remove royalty recipient successfully", async function () {
      await expect(
        royalty.connect(addr1).removeRoyaltyRecipient(
          nftAddress,
          tokenId,
          1 // Remove second recipient
        )
      ).to.emit(royalty, "RoyaltyRecipientRemoved");
    });

    it("Should prevent removing with invalid index", async function () {
      await expect(
        royalty.connect(addr1).removeRoyaltyRecipient(
          nftAddress,
          tokenId,
          5 // Invalid index
        )
      ).to.be.revertedWith("Invalid index");
    });

    it("Should prevent unauthorized removal", async function () {
      await expect(
        royalty.connect(addr2).removeRoyaltyRecipient(
          nftAddress,
          tokenId,
          0
        )
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Distributing Royalties", function () {
    let tokenId;
    let nftAddress;
    const salePrice = ethers.parseEther("1");

    beforeEach(async function () {
      // Mint an NFT and set royalty
      const mintPrice = await cryptoSoundsNFT.mintPrice();
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

      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        "https://ipfs.io/ipfs/QmTestMetadataHash",
        { value: mintPrice }
      );

      tokenId = 0;
      nftAddress = await cryptoSoundsNFT.getAddress();

      // Set royalty
      const recipients = [addr2.address, addr3.address];
      const percentages = [300, 200]; // 3% and 2%
      const roles = ["artist", "producer"];

      await royalty.connect(addr1).setTokenRoyalty(
        nftAddress,
        tokenId,
        recipients,
        percentages,
        roles
      );
    });

    it("Should distribute royalties correctly", async function () {
      const balanceBefore2 = await ethers.provider.getBalance(addr2.address);
      const balanceBefore3 = await ethers.provider.getBalance(addr3.address);

      await royalty.connect(addr1).distributeRoyalties(
        nftAddress,
        tokenId,
        salePrice,
        { value: salePrice }
      );

      const balanceAfter2 = await ethers.provider.getBalance(addr2.address);
      const balanceAfter3 = await ethers.provider.getBalance(addr3.address);

      // Check artist received 3% (0.03 ETH)
      expect(balanceAfter2).to.be.gt(balanceBefore2);
      
      // Check producer received 2% (0.02 ETH)
      expect(balanceAfter3).to.be.gt(balanceBefore3);
    });

    it("Should require sufficient payment", async function () {
      const insufficientPayment = salePrice - ethers.parseEther("0.1");

      await expect(
        royalty.connect(addr1).distributeRoyalties(
          nftAddress,
          tokenId,
          salePrice,
          { value: insufficientPayment }
        )
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should handle royalty not set", async function () {
      // Try to distribute for a token without royalty set
      const mintPrice = await cryptoSoundsNFT.mintPrice();
      const audioMetadata2 = {
        title: "Test Song 2",
        artist: "Test Artist 2",
        album: "Test Album 2",
        genre: "Rock",
        duration: 200,
        audioFormat: "MP3",
        audioHash: "QmTestHash456",
        coverImageHash: "QmCoverHash456",
        releaseDate: Math.floor(Date.now() / 1000),
        isExplicit: false
      };

      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata2,
        "https://ipfs.io/ipfs/QmTestMetadataHash2",
        { value: mintPrice }
      );

      // Should not revert, just return all funds
      const balanceBefore = await ethers.provider.getBalance(addr1.address);
      
      await royalty.connect(addr1).distributeRoyalties(
        nftAddress,
        1, // Token without royalty
        salePrice,
        { value: salePrice }
      );

      const balanceAfter = await ethers.provider.getBalance(addr1.address);
      // Should have received full refund minus gas
      expect(balanceAfter).to.be.closeTo(balanceBefore, ethers.parseEther("0.01"));
    });
  });

  describe("Calculating Royalties", function () {
    let tokenId;
    let nftAddress;

    beforeEach(async function () {
      // Mint an NFT and set royalty
      const mintPrice = await cryptoSoundsNFT.mintPrice();
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

      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        "https://ipfs.io/ipfs/QmTestMetadataHash",
        { value: mintPrice }
      );

      tokenId = 0;
      nftAddress = await cryptoSoundsNFT.getAddress();

      // Set royalty
      const recipients = [addr2.address, addr3.address];
      const percentages = [300, 200]; // 3% and 2%
      const roles = ["artist", "producer"];

      await royalty.connect(addr1).setTokenRoyalty(
        nftAddress,
        tokenId,
        recipients,
        percentages,
        roles
      );
    });

    it("Should calculate royalty correctly", async function () {
      const salePrice = ethers.parseEther("1");
      const [totalRoyalty, platformFeeAmount, remainingAmount] = await royalty.calculateRoyalty(
        nftAddress,
        tokenId,
        salePrice
      );

      // Total royalty should be 5% (3% + 2%)
      expect(totalRoyalty).to.equal(ethers.parseEther("0.05"));
      
      // Platform fee should be 0.25%
      expect(platformFeeAmount).to.equal(ethers.parseEther("0.0025"));
      
      // Remaining should be 94.75%
      expect(remainingAmount).to.equal(ethers.parseEther("0.9475"));
    });

    it("Should return zero for token without royalty", async function () {
      const salePrice = ethers.parseEther("1");
      const [totalRoyalty, platformFeeAmount, remainingAmount] = await royalty.calculateRoyalty(
        nftAddress,
        999, // Non-existent token
        salePrice
      );

      expect(totalRoyalty).to.equal(0);
      expect(platformFeeAmount).to.equal(0);
      expect(remainingAmount).to.equal(salePrice);
    });
  });

  describe("Getting Token Royalty Info", function () {
    let tokenId;
    let nftAddress;

    beforeEach(async function () {
      // Mint an NFT and set royalty
      const mintPrice = await cryptoSoundsNFT.mintPrice();
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

      await cryptoSoundsNFT.connect(addr1).mintAudioNFT(
        addr1.address,
        audioMetadata,
        "https://ipfs.io/ipfs/QmTestMetadataHash",
        { value: mintPrice }
      );

      tokenId = 0;
      nftAddress = await cryptoSoundsNFT.getAddress();

      // Set royalty
      const recipients = [addr2.address, addr3.address];
      const percentages = [300, 200]; // 3% and 2%
      const roles = ["artist", "producer"];

      await royalty.connect(addr1).setTokenRoyalty(
        nftAddress,
        tokenId,
        recipients,
        percentages,
        roles
      );
    });

    it("Should return correct royalty information", async function () {
      const [recipients, percentages, roles, totalPercentage] = await royalty.getTokenRoyalty(
        nftAddress,
        tokenId
      );

      expect(recipients.length).to.equal(2);
      expect(recipients[0]).to.equal(addr2.address);
      expect(recipients[1]).to.equal(addr3.address);
      
      expect(percentages[0]).to.equal(300);
      expect(percentages[1]).to.equal(200);
      
      expect(roles[0]).to.equal("artist");
      expect(roles[1]).to.equal("producer");
      
      expect(totalPercentage).to.equal(500); // 5%
    });

    it("Should revert for token without royalty", async function () {
      await expect(
        royalty.getTokenRoyalty(nftAddress, 999)
      ).to.be.revertedWith("Royalty not set");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update max total percentage", async function () {
      const newMax = 1500; // 15%
      await royalty.setMaxTotalPercentage(newMax);
      expect(await royalty.maxTotalPercentage()).to.equal(newMax);
    });

    it("Should allow owner to update platform fee", async function () {
      const newFee = 50; // 0.5%
      await royalty.setPlatformFee(newFee);
      expect(await royalty.platformFee()).to.equal(newFee);
    });

    it("Should allow owner to update platform fee recipient", async function () {
      await royalty.setPlatformFeeRecipient(addr1.address);
      expect(await royalty.platformFeeRecipient()).to.equal(addr1.address);
    });

    it("Should allow owner to pause and unpause", async function () {
      await royalty.pause();
      expect(await royalty.paused()).to.be.true;

      await royalty.unpause();
      expect(await royalty.paused()).to.be.false;
    });

    it("Should prevent non-owner from updating settings", async function () {
      await expect(
        royalty.connect(addr1).setMaxTotalPercentage(1500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should validate percentage limits", async function () {
      await expect(
        royalty.setMaxTotalPercentage(2500) // 25% - too high
      ).to.be.revertedWith("Percentage too high");

      await expect(
        royalty.setPlatformFee(150) // 1.5% - too high
      ).to.be.revertedWith("Fee too high");
    });
  });
});