// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CryptoSoundsNFT
 * @dev NFT contract for minting audio files (WAV, MP3) as unique digital assets
 * @author Crypto Sounds Team
 */
contract CryptoSoundsNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;

    // Token counter for unique IDs
    Counters.Counter private _tokenIdCounter;

    // Audio metadata structure
    struct AudioMetadata {
        string title;
        string artist;
        string genre;
        uint256 duration; // Duration in seconds
        string audioFormat; // "WAV", "MP3", etc.
        uint256 fileSize; // File size in bytes
        string description;
        uint256 releaseDate;
    }

    // Mapping from token ID to audio metadata
    mapping(uint256 => AudioMetadata) public audioMetadata;

    // Minting configuration
    uint256 public mintPrice = 0.01 ether; // Default mint price
    uint256 public maxSupply = 10000; // Maximum number of NFTs
    bool public mintingEnabled = true;

    // Royalty information
    uint256 public royaltyPercentage = 500; // 5% royalty (500 basis points)
    address public royaltyRecipient;

    // Events
    event AudioNFTMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string title,
        string artist,
        string audioFormat,
        uint256 duration
    );

    event MintPriceUpdated(uint256 newPrice);
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event MintingToggled(bool enabled);
    event RoyaltyUpdated(uint256 newPercentage, address newRecipient);

    constructor(
        string memory name,
        string memory symbol,
        address _royaltyRecipient
    ) ERC721(name, symbol) {
        royaltyRecipient = _royaltyRecipient;
    }

    /**
     * @dev Mint a new audio NFT
     * @param to Address to mint the NFT to
     * @param audioFileURI IPFS URI of the audio file
     * @param metadata Audio metadata
     */
    function mintAudioNFT(
        address to,
        string memory audioFileURI,
        AudioMetadata memory metadata
    ) public payable nonReentrant returns (uint256) {
        require(mintingEnabled, "Minting is currently disabled");
        require(_tokenIdCounter.current() < maxSupply, "Maximum supply reached");
        require(msg.value >= mintPrice, "Insufficient payment for minting");
        require(bytes(metadata.title).length > 0, "Title cannot be empty");
        require(bytes(metadata.artist).length > 0, "Artist cannot be empty");
        require(bytes(metadata.audioFormat).length > 0, "Audio format cannot be empty");
        require(metadata.duration > 0, "Duration must be greater than 0");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Store metadata
        audioMetadata[tokenId] = metadata;

        // Mint the NFT
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, audioFileURI);

        // Refund excess payment
        if (msg.value > mintPrice) {
            payable(msg.sender).transfer(msg.value - mintPrice);
        }

        emit AudioNFTMinted(
            tokenId,
            to,
            metadata.title,
            metadata.artist,
            metadata.audioFormat,
            metadata.duration
        );

        return tokenId;
    }

    /**
     * @dev Batch mint multiple audio NFTs
     * @param to Address to mint the NFTs to
     * @param audioFileURIs Array of IPFS URIs
     * @param metadataArray Array of audio metadata
     */
    function batchMintAudioNFTs(
        address to,
        string[] memory audioFileURIs,
        AudioMetadata[] memory metadataArray
    ) public payable nonReentrant returns (uint256[] memory) {
        require(audioFileURIs.length == metadataArray.length, "Arrays length mismatch");
        require(audioFileURIs.length > 0, "Cannot mint zero NFTs");
        require(_tokenIdCounter.current() + audioFileURIs.length <= maxSupply, "Would exceed max supply");
        require(msg.value >= mintPrice * audioFileURIs.length, "Insufficient payment for minting");

        uint256[] memory tokenIds = new uint256[](audioFileURIs.length);

        for (uint256 i = 0; i < audioFileURIs.length; i++) {
            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();

            // Store metadata
            audioMetadata[tokenId] = metadataArray[i];

            // Mint the NFT
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, audioFileURIs[i]);

            tokenIds[i] = tokenId;

            emit AudioNFTMinted(
                tokenId,
                to,
                metadataArray[i].title,
                metadataArray[i].artist,
                metadataArray[i].audioFormat,
                metadataArray[i].duration
            );
        }

        // Refund excess payment
        uint256 totalCost = mintPrice * audioFileURIs.length;
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        return tokenIds;
    }

    /**
     * @dev Get audio metadata for a token
     * @param tokenId Token ID
     * @return AudioMetadata struct
     */
    function getAudioMetadata(uint256 tokenId) public view returns (AudioMetadata memory) {
        require(_exists(tokenId), "Token does not exist");
        return audioMetadata[tokenId];
    }

    /**
     * @dev Update mint price (owner only)
     */
    function setMintPrice(uint256 _mintPrice) public onlyOwner {
        mintPrice = _mintPrice;
        emit MintPriceUpdated(_mintPrice);
    }

    /**
     * @dev Update max supply (owner only)
     */
    function setMaxSupply(uint256 _maxSupply) public onlyOwner {
        require(_maxSupply >= _tokenIdCounter.current(), "Cannot set max supply below current supply");
        maxSupply = _maxSupply;
        emit MaxSupplyUpdated(_maxSupply);
    }

    /**
     * @dev Toggle minting (owner only)
     */
    function toggleMinting() public onlyOwner {
        mintingEnabled = !mintingEnabled;
        emit MintingToggled(mintingEnabled);
    }

    /**
     * @dev Update royalty information (owner only)
     */
    function updateRoyalty(uint256 _percentage, address _recipient) public onlyOwner {
        require(_percentage <= 1000, "Royalty cannot exceed 10%");
        require(_recipient != address(0), "Invalid royalty recipient");
        
        royaltyPercentage = _percentage;
        royaltyRecipient = _recipient;
        emit RoyaltyUpdated(_percentage, _recipient);
    }

    /**
     * @dev Withdraw contract balance (owner only)
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Get total number of minted tokens
     */
    function totalSupply() public view override returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @dev EIP-2981 royalty standard implementation
     */
    function royaltyInfo(uint256, uint256 salePrice) public view returns (address, uint256) {
        return (royaltyRecipient, (salePrice * royaltyPercentage) / 10000);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}