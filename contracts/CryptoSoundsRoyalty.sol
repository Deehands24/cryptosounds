// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

/**
 * @title CryptoSoundsRoyalty
 * @dev Advanced royalty management contract for audio NFTs
 * @author CryptoSounds
 */
contract CryptoSoundsRoyalty is Ownable, ReentrancyGuard, Pausable {
    
    // Royalty recipient structure
    struct RoyaltyRecipient {
        address recipient;
        uint96 percentage; // in basis points (10000 = 100%)
        bool isActive;
        string role; // "artist", "producer", "label", etc.
    }

    // Token royalty structure
    struct TokenRoyalty {
        uint256 tokenId;
        address nftContract;
        RoyaltyRecipient[] recipients;
        uint96 totalPercentage;
        bool isActive;
    }

    // State variables
    mapping(bytes32 => TokenRoyalty) public tokenRoyalties;
    mapping(address => mapping(uint256 => bytes32)) public tokenToRoyaltyId;
    
    uint96 public maxTotalPercentage = 1000; // 10% max total royalty
    uint96 public platformFee = 25; // 0.25% platform fee
    
    address public platformFeeRecipient;
    
    // Events
    event RoyaltySet(
        bytes32 indexed royaltyId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address[] recipients,
        uint96[] percentages
    );
    
    event RoyaltyPaid(
        bytes32 indexed royaltyId,
        address indexed recipient,
        uint256 amount,
        string role
    );
    
    event RoyaltyRecipientAdded(
        bytes32 indexed royaltyId,
        address indexed recipient,
        uint96 percentage,
        string role
    );
    
    event RoyaltyRecipientRemoved(
        bytes32 indexed royaltyId,
        address indexed recipient
    );
    
    event PlatformFeeUpdated(uint96 newFee);
    event MaxTotalPercentageUpdated(uint96 newMax);

    constructor(address _platformFeeRecipient) {
        platformFeeRecipient = _platformFeeRecipient;
    }

    /**
     * @dev Set royalty recipients for a token
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID
     * @param recipients Array of recipient addresses
     * @param percentages Array of percentages (in basis points)
     * @param roles Array of roles for each recipient
     */
    function setTokenRoyalty(
        address nftContract,
        uint256 tokenId,
        address[] memory recipients,
        uint96[] memory percentages,
        string[] memory roles
    ) external whenNotPaused {
        require(recipients.length == percentages.length, "Arrays length mismatch");
        require(recipients.length == roles.length, "Roles array length mismatch");
        require(recipients.length > 0, "At least one recipient required");
        require(recipients.length <= 10, "Too many recipients"); // Gas limit protection
        
        // Verify caller owns the token or is authorized
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender ||
            IERC721(nftContract).getApproved(tokenId) == msg.sender ||
            IERC721(nftContract).isApprovedForAll(IERC721(nftContract).ownerOf(tokenId), msg.sender),
            "Not authorized"
        );

        bytes32 royaltyId = keccak256(
            abi.encodePacked(nftContract, tokenId, block.timestamp)
        );

        uint96 totalPercentage = 0;
        for (uint256 i = 0; i < percentages.length; i++) {
            require(percentages[i] > 0, "Percentage must be positive");
            require(percentages[i] <= 1000, "Percentage too high"); // Max 10% per recipient
            totalPercentage += percentages[i];
        }
        
        require(totalPercentage <= maxTotalPercentage, "Total percentage too high");

        // Create new royalty structure
        TokenRoyalty storage royalty = tokenRoyalties[royaltyId];
        royalty.tokenId = tokenId;
        royalty.nftContract = nftContract;
        royalty.totalPercentage = totalPercentage;
        royalty.isActive = true;

        // Add recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            royalty.recipients.push(RoyaltyRecipient({
                recipient: recipients[i],
                percentage: percentages[i],
                isActive: true,
                role: roles[i]
            }));
        }

        // Update token mapping
        tokenToRoyaltyId[nftContract][tokenId] = royaltyId;

        emit RoyaltySet(royaltyId, nftContract, tokenId, recipients, percentages);
    }

    /**
     * @dev Add a royalty recipient to an existing token
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID
     * @param recipient Recipient address
     * @param percentage Percentage (in basis points)
     * @param role Role of the recipient
     */
    function addRoyaltyRecipient(
        address nftContract,
        uint256 tokenId,
        address recipient,
        uint96 percentage,
        string memory role
    ) external whenNotPaused {
        bytes32 royaltyId = tokenToRoyaltyId[nftContract][tokenId];
        require(royaltyId != bytes32(0), "Royalty not set");
        
        TokenRoyalty storage royalty = tokenRoyalties[royaltyId];
        require(royalty.isActive, "Royalty not active");
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender ||
            IERC721(nftContract).getApproved(tokenId) == msg.sender ||
            IERC721(nftContract).isApprovedForAll(IERC721(nftContract).ownerOf(tokenId), msg.sender),
            "Not authorized"
        );
        require(recipient != address(0), "Invalid recipient address");
        require(percentage > 0, "Percentage must be positive");
        require(percentage <= 1000, "Percentage too high");
        require(royalty.totalPercentage + percentage <= maxTotalPercentage, "Total percentage too high");

        royalty.recipients.push(RoyaltyRecipient({
            recipient: recipient,
            percentage: percentage,
            isActive: true,
            role: role
        }));
        
        royalty.totalPercentage += percentage;

        emit RoyaltyRecipientAdded(royaltyId, recipient, percentage, role);
    }

    /**
     * @dev Remove a royalty recipient
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID
     * @param recipientIndex Index of the recipient to remove
     */
    function removeRoyaltyRecipient(
        address nftContract,
        uint256 tokenId,
        uint256 recipientIndex
    ) external whenNotPaused {
        bytes32 royaltyId = tokenToRoyaltyId[nftContract][tokenId];
        require(royaltyId != bytes32(0), "Royalty not set");
        
        TokenRoyalty storage royalty = tokenRoyalties[royaltyId];
        require(royalty.isActive, "Royalty not active");
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender ||
            IERC721(nftContract).getApproved(tokenId) == msg.sender ||
            IERC721(nftContract).isApprovedForAll(IERC721(nftContract).ownerOf(tokenId), msg.sender),
            "Not authorized"
        );
        require(recipientIndex < royalty.recipients.length, "Invalid index");

        RoyaltyRecipient memory removedRecipient = royalty.recipients[recipientIndex];
        royalty.totalPercentage -= removedRecipient.percentage;

        // Remove recipient by swapping with last element
        royalty.recipients[recipientIndex] = royalty.recipients[royalty.recipients.length - 1];
        royalty.recipients.pop();

        emit RoyaltyRecipientRemoved(royaltyId, removedRecipient.recipient);
    }

    /**
     * @dev Distribute royalties for a token
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID
     * @param salePrice Sale price in wei
     */
    function distributeRoyalties(
        address nftContract,
        uint256 tokenId,
        uint256 salePrice
    ) external payable whenNotPaused nonReentrant {
        require(msg.value >= salePrice, "Insufficient payment");
        
        bytes32 royaltyId = tokenToRoyaltyId[nftContract][tokenId];
        require(royaltyId != bytes32(0), "Royalty not set");
        
        TokenRoyalty storage royalty = tokenRoyalties[royaltyId];
        require(royalty.isActive, "Royalty not active");

        uint256 totalRoyaltyAmount = (salePrice * royalty.totalPercentage) / 10000;
        uint256 platformFeeAmount = (salePrice * platformFee) / 10000;
        uint256 remainingAmount = salePrice - totalRoyaltyAmount - platformFeeAmount;

        // Distribute royalties to recipients
        for (uint256 i = 0; i < royalty.recipients.length; i++) {
            if (royalty.recipients[i].isActive) {
                uint256 recipientAmount = (salePrice * royalty.recipients[i].percentage) / 10000;
                
                (bool success, ) = payable(royalty.recipients[i].recipient).call{value: recipientAmount}("");
                require(success, "Royalty payment failed");
                
                emit RoyaltyPaid(
                    royaltyId,
                    royalty.recipients[i].recipient,
                    recipientAmount,
                    royalty.recipients[i].role
                );
            }
        }

        // Pay platform fee
        if (platformFeeAmount > 0) {
            (bool success, ) = payable(platformFeeRecipient).call{value: platformFeeAmount}("");
            require(success, "Platform fee payment failed");
        }

        // Refund remaining amount to caller
        if (remainingAmount > 0) {
            (bool success, ) = payable(msg.sender).call{value: remainingAmount}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @dev Get royalty information for a token
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID
     * @return recipients Array of recipient addresses
     * @return percentages Array of percentages
     * @return roles Array of roles
     * @return totalPercentage Total royalty percentage
     */
    function getTokenRoyalty(
        address nftContract,
        uint256 tokenId
    ) external view returns (
        address[] memory recipients,
        uint96[] memory percentages,
        string[] memory roles,
        uint96 totalPercentage
    ) {
        bytes32 royaltyId = tokenToRoyaltyId[nftContract][tokenId];
        require(royaltyId != bytes32(0), "Royalty not set");
        
        TokenRoyalty storage royalty = tokenRoyalties[royaltyId];
        require(royalty.isActive, "Royalty not active");

        uint256 activeCount = 0;
        for (uint256 i = 0; i < royalty.recipients.length; i++) {
            if (royalty.recipients[i].isActive) {
                activeCount++;
            }
        }

        recipients = new address[](activeCount);
        percentages = new uint96[](activeCount);
        roles = new string[](activeCount);

        uint256 index = 0;
        for (uint256 i = 0; i < royalty.recipients.length; i++) {
            if (royalty.recipients[i].isActive) {
                recipients[index] = royalty.recipients[i].recipient;
                percentages[index] = royalty.recipients[i].percentage;
                roles[index] = royalty.recipients[i].role;
                index++;
            }
        }

        totalPercentage = royalty.totalPercentage;
    }

    /**
     * @dev Calculate royalty amount for a token
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID
     * @param salePrice Sale price in wei
     * @return totalRoyalty Total royalty amount
     * @return platformFeeAmount Platform fee amount
     * @return remainingAmount Remaining amount after royalties
     */
    function calculateRoyalty(
        address nftContract,
        uint256 tokenId,
        uint256 salePrice
    ) external view returns (
        uint256 totalRoyalty,
        uint256 platformFeeAmount,
        uint256 remainingAmount
    ) {
        bytes32 royaltyId = tokenToRoyaltyId[nftContract][tokenId];
        if (royaltyId == bytes32(0)) {
            return (0, 0, salePrice);
        }
        
        TokenRoyalty storage royalty = tokenRoyalties[royaltyId];
        if (!royalty.isActive) {
            return (0, 0, salePrice);
        }

        totalRoyalty = (salePrice * royalty.totalPercentage) / 10000;
        platformFeeAmount = (salePrice * platformFee) / 10000;
        remainingAmount = salePrice - totalRoyalty - platformFeeAmount;
    }

    // Admin functions
    function setMaxTotalPercentage(uint96 _maxPercentage) external onlyOwner {
        require(_maxPercentage <= 2000, "Percentage too high"); // Max 20%
        maxTotalPercentage = _maxPercentage;
        emit MaxTotalPercentageUpdated(_maxPercentage);
    }

    function setPlatformFee(uint96 _platformFee) external onlyOwner {
        require(_platformFee <= 100, "Fee too high"); // Max 1%
        platformFee = _platformFee;
        emit PlatformFeeUpdated(_platformFee);
    }

    function setPlatformFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid address");
        platformFeeRecipient = _recipient;
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
}