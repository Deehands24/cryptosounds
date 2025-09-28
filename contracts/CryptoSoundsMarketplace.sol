// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "./CryptoSoundsNFT.sol";

/**
 * @title CryptoSoundsMarketplace
 * @dev Marketplace contract for trading audio NFTs
 * @author CryptoSounds
 */
contract CryptoSoundsMarketplace is ReentrancyGuard, Ownable, Pausable, IERC721Receiver {
    
    // Listing structure
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool isActive;
        uint256 listingTime;
        uint256 expirationTime;
    }

    // Offer structure
    struct Offer {
        address bidder;
        uint256 amount;
        bool isActive;
        uint256 offerTime;
        uint256 expirationTime;
    }

    // Auction structure
    struct Auction {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 startingPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
    }

    // State variables
    mapping(bytes32 => Listing) public listings;
    mapping(bytes32 => Offer) public offers;
    mapping(bytes32 => Auction) public auctions;
    
    uint256 public listingFee = 0.01 ether; // 0.01 ETH listing fee
    uint256 public marketplaceFee = 250; // 2.5% marketplace fee (in basis points)
    uint256 public auctionDuration = 7 days;
    uint256 public offerDuration = 3 days;
    
    address public feeRecipient;
    
    // Events
    event ItemListed(
        bytes32 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 expirationTime
    );
    
    event ItemDelisted(bytes32 indexed listingId);
    
    event ItemSold(
        bytes32 indexed listingId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    
    event OfferMade(
        bytes32 indexed offerId,
        address indexed bidder,
        address indexed nftContract,
        uint256 tokenId,
        uint256 amount,
        uint256 expirationTime
    );
    
    event OfferAccepted(
        bytes32 indexed offerId,
        address indexed seller,
        address indexed bidder,
        uint256 amount
    );
    
    event OfferCancelled(bytes32 indexed offerId);
    
    event AuctionCreated(
        bytes32 indexed auctionId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 endTime
    );
    
    event BidPlaced(
        bytes32 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );
    
    event AuctionEnded(
        bytes32 indexed auctionId,
        address indexed winner,
        uint256 winningBid
    );
    
    event AuctionCancelled(bytes32 indexed auctionId);

    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev List an NFT for sale
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to list
     * @param price Sale price in wei
     * @param expirationTime When the listing expires (0 for no expiration)
     */
    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 expirationTime
    ) external payable whenNotPaused nonReentrant {
        require(msg.value >= listingFee, "Insufficient listing fee");
        require(price > 0, "Price must be greater than 0");
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            "Not the owner"
        );
        require(
            IERC721(nftContract).getApproved(tokenId) == address(this) ||
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)),
            "Contract not approved"
        );

        bytes32 listingId = keccak256(
            abi.encodePacked(nftContract, tokenId, msg.sender, block.timestamp)
        );

        require(!listings[listingId].isActive, "Already listed");

        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            isActive: true,
            listingTime: block.timestamp,
            expirationTime: expirationTime
        });

        emit ItemListed(listingId, msg.sender, nftContract, tokenId, price, expirationTime);
    }

    /**
     * @dev Buy a listed NFT
     * @param listingId ID of the listing
     */
    function buyItem(bytes32 listingId) external payable whenNotPaused nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(msg.sender != listing.seller, "Cannot buy own item");
        require(msg.value >= listing.price, "Insufficient payment");
        
        if (listing.expirationTime > 0) {
            require(block.timestamp <= listing.expirationTime, "Listing expired");
        }

        // Transfer NFT
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        // Calculate fees
        uint256 marketplaceFeeAmount = (listing.price * marketplaceFee) / 10000;
        uint256 sellerAmount = listing.price - marketplaceFeeAmount;

        // Transfer payments
        (bool success1, ) = payable(listing.seller).call{value: sellerAmount}("");
        require(success1, "Payment to seller failed");

        if (marketplaceFeeAmount > 0) {
            (bool success2, ) = payable(feeRecipient).call{value: marketplaceFeeAmount}("");
            require(success2, "Payment to marketplace failed");
        }

        // Refund excess payment
        if (msg.value > listing.price) {
            (bool success3, ) = payable(msg.sender).call{value: msg.value - listing.price}("");
            require(success3, "Refund failed");
        }

        // Deactivate listing
        listing.isActive = false;

        emit ItemSold(listingId, listing.seller, msg.sender, listing.price);
    }

    /**
     * @dev Delist an item
     * @param listingId ID of the listing
     */
    function delistItem(bytes32 listingId) external whenNotPaused {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");

        listing.isActive = false;
        emit ItemDelisted(listingId);
    }

    /**
     * @dev Make an offer on an NFT
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to make offer on
     * @param amount Offer amount in wei
     * @param expirationTime When the offer expires
     */
    function makeOffer(
        address nftContract,
        uint256 tokenId,
        uint256 amount,
        uint256 expirationTime
    ) external payable whenNotPaused nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(msg.value >= amount, "Insufficient payment");
        require(
            IERC721(nftContract).ownerOf(tokenId) != msg.sender,
            "Cannot offer on own NFT"
        );

        if (expirationTime == 0) {
            expirationTime = block.timestamp + offerDuration;
        }

        bytes32 offerId = keccak256(
            abi.encodePacked(nftContract, tokenId, msg.sender, block.timestamp)
        );

        require(!offers[offerId].isActive, "Offer already exists");

        offers[offerId] = Offer({
            bidder: msg.sender,
            amount: amount,
            isActive: true,
            offerTime: block.timestamp,
            expirationTime: expirationTime
        });

        emit OfferMade(offerId, msg.sender, nftContract, tokenId, amount, expirationTime);
    }

    /**
     * @dev Accept an offer
     * @param offerId ID of the offer
     */
    function acceptOffer(bytes32 offerId) external whenNotPaused nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(block.timestamp <= offer.expirationTime, "Offer expired");

        // Get the NFT contract and token ID from the offer
        // Note: In a real implementation, you'd need to store this information
        // For now, we'll require the caller to provide it
        require(msg.sender != offer.bidder, "Cannot accept own offer");

        // Calculate fees
        uint256 marketplaceFeeAmount = (offer.amount * marketplaceFee) / 10000;
        uint256 sellerAmount = offer.amount - marketplaceFeeAmount;

        // Transfer payments
        (bool success1, ) = payable(msg.sender).call{value: sellerAmount}("");
        require(success1, "Payment to seller failed");

        if (marketplaceFeeAmount > 0) {
            (bool success2, ) = payable(feeRecipient).call{value: marketplaceFeeAmount}("");
            require(success2, "Payment to marketplace failed");
        }

        // Deactivate offer
        offer.isActive = false;

        emit OfferAccepted(offerId, msg.sender, offer.bidder, offer.amount);
    }

    /**
     * @dev Cancel an offer
     * @param offerId ID of the offer
     */
    function cancelOffer(bytes32 offerId) external whenNotPaused nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.bidder == msg.sender, "Not the bidder");

        // Refund the bidder
        (bool success, ) = payable(offer.bidder).call{value: offer.amount}("");
        require(success, "Refund failed");

        offer.isActive = false;
        emit OfferCancelled(offerId);
    }

    /**
     * @dev Create an auction
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to auction
     * @param startingPrice Starting price in wei
     * @param duration Auction duration in seconds
     */
    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 duration
    ) external payable whenNotPaused nonReentrant {
        require(msg.value >= listingFee, "Insufficient listing fee");
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            "Not the owner"
        );
        require(
            IERC721(nftContract).getApproved(tokenId) == address(this) ||
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)),
            "Contract not approved"
        );

        if (duration == 0) {
            duration = auctionDuration;
        }

        bytes32 auctionId = keccak256(
            abi.encodePacked(nftContract, tokenId, msg.sender, block.timestamp)
        );

        require(!auctions[auctionId].isActive, "Auction already exists");

        auctions[auctionId] = Auction({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            startingPrice: startingPrice,
            highestBid: 0,
            highestBidder: address(0),
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            isActive: true
        });

        emit AuctionCreated(auctionId, msg.sender, nftContract, tokenId, startingPrice, block.timestamp + duration);
    }

    /**
     * @dev Place a bid on an auction
     * @param auctionId ID of the auction
     */
    function placeBid(bytes32 auctionId) external payable whenNotPaused nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.sender != auction.seller, "Cannot bid on own auction");
        require(msg.value > auction.highestBid, "Bid too low");
        require(msg.value >= auction.startingPrice, "Bid below starting price");

        // Refund previous highest bidder
        if (auction.highestBidder != address(0)) {
            (bool success, ) = payable(auction.highestBidder).call{value: auction.highestBid}("");
            require(success, "Refund failed");
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @dev End an auction
     * @param auctionId ID of the auction
     */
    function endAuction(bytes32 auctionId) external whenNotPaused nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(
            block.timestamp >= auction.endTime || msg.sender == auction.seller,
            "Auction not ended"
        );

        if (auction.highestBidder != address(0)) {
            // Transfer NFT to winner
            IERC721(auction.nftContract).safeTransferFrom(
                auction.seller,
                auction.highestBidder,
                auction.tokenId
            );

            // Calculate fees
            uint256 marketplaceFeeAmount = (auction.highestBid * marketplaceFee) / 10000;
            uint256 sellerAmount = auction.highestBid - marketplaceFeeAmount;

            // Transfer payments
            (bool success1, ) = payable(auction.seller).call{value: sellerAmount}("");
            require(success1, "Payment to seller failed");

            if (marketplaceFeeAmount > 0) {
                (bool success2, ) = payable(feeRecipient).call{value: marketplaceFeeAmount}("");
                require(success2, "Payment to marketplace failed");
            }

            emit AuctionEnded(auctionId, auction.highestBidder, auction.highestBid);
        } else {
            emit AuctionEnded(auctionId, address(0), 0);
        }

        auction.isActive = false;
    }

    /**
     * @dev Cancel an auction
     * @param auctionId ID of the auction
     */
    function cancelAuction(bytes32 auctionId) external whenNotPaused nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(auction.seller == msg.sender, "Not the seller");
        require(auction.highestBidder == address(0), "Cannot cancel with bids");

        auction.isActive = false;
        emit AuctionCancelled(auctionId);
    }

    // Admin functions
    function setListingFee(uint256 _listingFee) external onlyOwner {
        listingFee = _listingFee;
    }

    function setMarketplaceFee(uint256 _marketplaceFee) external onlyOwner {
        require(_marketplaceFee <= 1000, "Fee too high"); // Max 10%
        marketplaceFee = _marketplaceFee;
    }

    function setAuctionDuration(uint256 _duration) external onlyOwner {
        auctionDuration = _duration;
    }

    function setOfferDuration(uint256 _duration) external onlyOwner {
        offerDuration = _duration;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    // Required by IERC721Receiver
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}