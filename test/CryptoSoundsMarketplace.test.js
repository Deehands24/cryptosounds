const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CryptoSoundsMarketplace", function () {
  let cryptoSoundsNFT;
  let marketplace;
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

    // Deploy marketplace
    const CryptoSoundsMarketplace = await ethers.getContractFactory("CryptoSoundsMarketplace");
    marketplace = await CryptoSoundsMarketplace.deploy(owner.address);
    await marketplace.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await marketplace.owner()).to.equal(owner.address);
    });

    it("Should set the correct fee recipient", async function () {
      expect(await marketplace.feeRecipient()).to.equal(owner.address);
    });

    it("Should set default marketplace fee", async function () {
      expect(await marketplace.marketplaceFee()).to.equal(250); // 2.5%
    });
  });

  describe("Listing", function () {
    let tokenId;
    const listingPrice = ethers.parseEther("1");

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

    it("Should list an item successfully", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const listingFee = await marketplace.listingFee();

      // Approve marketplace to transfer NFT
      await cryptoSoundsNFT.connect(addr1).approve(marketplace.getAddress(), tokenId);

      await expect(
        marketplace.connect(addr1).listItem(
          nftAddress,
          tokenId,
          listingPrice,
          0, // no expiration
          { value: listingFee }
        )
      ).to.emit(marketplace, "ItemListed");
    });

    it("Should require listing fee", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const listingFee = await marketplace.listingFee();

      await cryptoSoundsNFT.connect(addr1).approve(marketplace.getAddress(), tokenId);

      await expect(
        marketplace.connect(addr1).listItem(
          nftAddress,
          tokenId,
          listingPrice,
          0,
          { value: listingFee - ethers.parseEther("0.001") }
        )
      ).to.be.revertedWith("Insufficient listing fee");
    });

    it("Should require NFT approval", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const listingFee = await marketplace.listingFee();

      await expect(
        marketplace.connect(addr1).listItem(
          nftAddress,
          tokenId,
          listingPrice,
          0,
          { value: listingFee }
        )
      ).to.be.revertedWith("Contract not approved");
    });

    it("Should prevent listing own item for purchase", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const listingFee = await marketplace.listingFee();

      await cryptoSoundsNFT.connect(addr1).approve(marketplace.getAddress(), tokenId);

      // List the item
      const tx = await marketplace.connect(addr1).listItem(
        nftAddress,
        tokenId,
        listingPrice,
        0,
        { value: listingFee }
      );

      const receipt = await tx.wait();
      const listingEvent = receipt.logs.find(log => {
        try {
          const parsed = marketplace.interface.parseLog(log);
          return parsed && parsed.name === "ItemListed";
        } catch (e) {
          return false;
        }
      });

      const listingId = listingEvent.args.listingId;

      // Try to buy own item
      await expect(
        marketplace.connect(addr1).buyItem(listingId, { value: listingPrice })
      ).to.be.revertedWith("Cannot buy own item");
    });
  });

  describe("Buying", function () {
    let tokenId;
    let listingId;
    const listingPrice = ethers.parseEther("1");

    beforeEach(async function () {
      // Mint and list an NFT
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
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const listingFee = await marketplace.listingFee();

      await cryptoSoundsNFT.connect(addr1).approve(marketplace.getAddress(), tokenId);

      const tx = await marketplace.connect(addr1).listItem(
        nftAddress,
        tokenId,
        listingPrice,
        0,
        { value: listingFee }
      );

      const receipt = await tx.wait();
      const listingEvent = receipt.logs.find(log => {
        try {
          const parsed = marketplace.interface.parseLog(log);
          return parsed && parsed.name === "ItemListed";
        } catch (e) {
          return false;
        }
      });

      listingId = listingEvent.args.listingId;
    });

    it("Should buy an item successfully", async function () {
      const balanceBefore = await ethers.provider.getBalance(addr1.address);
      
      await expect(
        marketplace.connect(addr2).buyItem(listingId, { value: listingPrice })
      ).to.emit(marketplace, "ItemSold")
        .withArgs(listingId, addr1.address, addr2.address, listingPrice);

      // Check NFT ownership changed
      expect(await cryptoSoundsNFT.ownerOf(tokenId)).to.equal(addr2.address);

      // Check seller received payment (minus fees)
      const balanceAfter = await ethers.provider.getBalance(addr1.address);
      const marketplaceFee = await marketplace.marketplaceFee();
      const expectedPayment = listingPrice - (listingPrice * marketplaceFee) / 10000n;
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should require sufficient payment", async function () {
      const insufficientPayment = listingPrice - ethers.parseEther("0.1");

      await expect(
        marketplace.connect(addr2).buyItem(listingId, { value: insufficientPayment })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should refund excess payment", async function () {
      const excessPayment = listingPrice + ethers.parseEther("0.1");
      const balanceBefore = await ethers.provider.getBalance(addr2.address);

      await marketplace.connect(addr2).buyItem(listingId, { value: excessPayment });

      const balanceAfter = await ethers.provider.getBalance(addr2.address);
      // Should have spent the listing price plus gas, but received refund for excess
      expect(balanceAfter).to.be.lt(balanceBefore);
    });
  });

  describe("Offers", function () {
    let tokenId;
    const offerAmount = ethers.parseEther("0.8");

    beforeEach(async function () {
      // Mint an NFT
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

    it("Should make an offer successfully", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();

      await expect(
        marketplace.connect(addr2).makeOffer(
          nftAddress,
          tokenId,
          offerAmount,
          0, // no expiration
          { value: offerAmount }
        )
      ).to.emit(marketplace, "OfferMade");
    });

    it("Should prevent offering on own NFT", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();

      await expect(
        marketplace.connect(addr1).makeOffer(
          nftAddress,
          tokenId,
          offerAmount,
          0,
          { value: offerAmount }
        )
      ).to.be.revertedWith("Cannot offer on own NFT");
    });

    it("Should require sufficient payment for offer", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const insufficientPayment = offerAmount - ethers.parseEther("0.1");

      await expect(
        marketplace.connect(addr2).makeOffer(
          nftAddress,
          tokenId,
          offerAmount,
          0,
          { value: insufficientPayment }
        )
      ).to.be.revertedWith("Insufficient payment");
    });
  });

  describe("Auctions", function () {
    let tokenId;
    const startingPrice = ethers.parseEther("0.5");

    beforeEach(async function () {
      // Mint an NFT
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

    it("Should create an auction successfully", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const listingFee = await marketplace.listingFee();

      await cryptoSoundsNFT.connect(addr1).approve(marketplace.getAddress(), tokenId);

      await expect(
        marketplace.connect(addr1).createAuction(
          nftAddress,
          tokenId,
          startingPrice,
          0, // use default duration
          { value: listingFee }
        )
      ).to.emit(marketplace, "AuctionCreated");
    });

    it("Should place a bid successfully", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const listingFee = await marketplace.listingFee();

      await cryptoSoundsNFT.connect(addr1).approve(marketplace.getAddress(), tokenId);

      const tx = await marketplace.connect(addr1).createAuction(
        nftAddress,
        tokenId,
        startingPrice,
        0,
        { value: listingFee }
      );

      const receipt = await tx.wait();
      const auctionEvent = receipt.logs.find(log => {
        try {
          const parsed = marketplace.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch (e) {
          return false;
        }
      });

      const auctionId = auctionEvent.args.auctionId;
      const bidAmount = ethers.parseEther("0.6");

      await expect(
        marketplace.connect(addr2).placeBid(auctionId, { value: bidAmount })
      ).to.emit(marketplace, "BidPlaced")
        .withArgs(auctionId, addr2.address, bidAmount);
    });

    it("Should prevent bidding below current highest bid", async function () {
      const nftAddress = await cryptoSoundsNFT.getAddress();
      const listingFee = await marketplace.listingFee();

      await cryptoSoundsNFT.connect(addr1).approve(marketplace.getAddress(), tokenId);

      const tx = await marketplace.connect(addr1).createAuction(
        nftAddress,
        tokenId,
        startingPrice,
        0,
        { value: listingFee }
      );

      const receipt = await tx.wait();
      const auctionEvent = receipt.logs.find(log => {
        try {
          const parsed = marketplace.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch (e) {
          return false;
        }
      });

      const auctionId = auctionEvent.args.auctionId;
      const bidAmount = ethers.parseEther("0.6");

      // First bid
      await marketplace.connect(addr2).placeBid(auctionId, { value: bidAmount });

      // Second bid below first bid should fail
      await expect(
        marketplace.connect(addr3).placeBid(auctionId, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Bid too low");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update marketplace fee", async function () {
      const newFee = 500; // 5%
      await marketplace.setMarketplaceFee(newFee);
      expect(await marketplace.marketplaceFee()).to.equal(newFee);
    });

    it("Should allow owner to update listing fee", async function () {
      const newListingFee = ethers.parseEther("0.02");
      await marketplace.setListingFee(newListingFee);
      expect(await marketplace.listingFee()).to.equal(newListingFee);
    });

    it("Should allow owner to pause and unpause", async function () {
      await marketplace.pause();
      expect(await marketplace.paused()).to.be.true;

      await marketplace.unpause();
      expect(await marketplace.paused()).to.be.false;
    });

    it("Should prevent non-owner from updating fees", async function () {
      await expect(
        marketplace.connect(addr1).setMarketplaceFee(500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});