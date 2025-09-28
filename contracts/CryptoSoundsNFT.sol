// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CryptoSoundsNFT
 * @dev NFT contract for minting audio files (WAV, MP3) as true NFTs
 * @author CryptoSounds
 */
contract CryptoSoundsNFT is 
    ERC721, 
    ERC721URIStorage, 
    ERC721Enumerable, 
    Ownable, 
    Pausable, 
    ReentrancyGuard, 
    ERC2981 
{
    using Counters for Counters.Counter;
    using Strings for uint256;

    // State variables
    Counters.Counter private _tokenIdCounter;
    
    // Audio file metadata structure
    struct AudioMetadata {
        string title;
        string artist;
        string album;
        string genre;
        uint256 duration; // in seconds
        string audioFormat; // WAV, MP3, etc.
        string audioHash; // IPFS hash of the audio file
        string coverImageHash; // IPFS hash of cover image
        uint256 releaseDate;
        bool isExplicit;
    }

    // Mapping from token ID to audio metadata
    mapping(uint256 => AudioMetadata) public audioMetadata;
    
    // Mapping from audio hash to token ID (to prevent duplicates)
    mapping(string => uint256) public audioHashToTokenId;
    
    // Minting configuration
    uint256 public maxSupply = 10000;
    uint256 public mintPrice = 0.1 ether;
    uint256 public maxMintsPerWallet = 5;
    
    // Royalty configuration
    uint96 public defaultRoyaltyPercentage = 500; // 5%
    
    // Events
    event AudioMinted(
        uint256 indexed tokenId,
        address indexed minter,
        string title,
        string artist,
        string audioHash
    );
    
    event AudioMetadataUpdated(
        uint256 indexed tokenId,
        string title,
        string artist
    );
    
    event MintPriceUpdated(uint256 newPrice);
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event MaxMintsPerWalletUpdated(uint256 newMaxMints);

    constructor(
        string memory name,
        string memory symbol,
        address royaltyReceiver
    ) ERC721(name, symbol) {
        _setDefaultRoyalty(royaltyReceiver, defaultRoyaltyPercentage);
    }

    /**
     * @dev Mint a new audio NFT
     * @param to Address to mint the NFT to
     * @param metadata Audio metadata
     * @param tokenURI URI for the token metadata
     */
    function mintAudioNFT(
        address to,
        AudioMetadata memory metadata,
        string memory tokenURI
    ) public payable whenNotPaused nonReentrant {
        require(msg.value >= mintPrice, "Insufficient payment");
        require(_tokenIdCounter.current() < maxSupply, "Max supply reached");
        require(audioHashToTokenId[metadata.audioHash] == 0, "Audio already minted");
        require(bytes(metadata.title).length > 0, "Title required");
        require(bytes(metadata.artist).length > 0, "Artist required");
        require(bytes(metadata.audioHash).length > 0, "Audio hash required");
        require(metadata.duration > 0, "Duration must be positive");
        
        // Check minting limits per wallet
        uint256 currentMints = balanceOf(to);
        require(currentMints < maxMintsPerWallet, "Max mints per wallet exceeded");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        // Store audio metadata
        audioMetadata[tokenId] = metadata;
        audioHashToTokenId[metadata.audioHash] = tokenId;
        
        // Mint the NFT
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit AudioMinted(tokenId, to, metadata.title, metadata.artist, metadata.audioHash);
    }

    /**
     * @dev Batch mint multiple audio NFTs
     * @param to Address to mint the NFTs to
     * @param metadatas Array of audio metadata
     * @param tokenURIs Array of token URIs
     */
    function batchMintAudioNFTs(
        address to,
        AudioMetadata[] memory metadatas,
        string[] memory tokenURIs
    ) public payable whenNotPaused nonReentrant {
        require(metadatas.length == tokenURIs.length, "Arrays length mismatch");
        require(metadatas.length > 0, "Empty arrays");
        require(msg.value >= mintPrice * metadatas.length, "Insufficient payment");
        require(_tokenIdCounter.current() + metadatas.length <= maxSupply, "Exceeds max supply");
        
        uint256 currentMints = balanceOf(to);
        require(currentMints + metadatas.length <= maxMintsPerWallet, "Exceeds max mints per wallet");

        for (uint256 i = 0; i < metadatas.length; i++) {
            require(audioHashToTokenId[metadatas[i].audioHash] == 0, "Audio already minted");
            require(bytes(metadatas[i].title).length > 0, "Title required");
            require(bytes(metadatas[i].artist).length > 0, "Artist required");
            require(bytes(metadatas[i].audioHash).length > 0, "Audio hash required");
            require(metadatas[i].duration > 0, "Duration must be positive");

            uint256 tokenId = _tokenIdCounter.current();
            _tokenIdCounter.increment();
            
            audioMetadata[tokenId] = metadatas[i];
            audioHashToTokenId[metadatas[i].audioHash] = tokenId;
            
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, tokenURIs[i]);
            
            emit AudioMinted(tokenId, to, metadatas[i].title, metadatas[i].artist, metadatas[i].audioHash);
        }
    }

    /**
     * @dev Update audio metadata (only by owner or token owner)
     * @param tokenId Token ID to update
     * @param newMetadata New metadata
     */
    function updateAudioMetadata(
        uint256 tokenId,
        AudioMetadata memory newMetadata
    ) public {
        require(_exists(tokenId), "Token does not exist");
        require(
            ownerOf(tokenId) == msg.sender || owner() == msg.sender,
            "Not authorized"
        );
        require(bytes(newMetadata.title).length > 0, "Title required");
        require(bytes(newMetadata.artist).length > 0, "Artist required");
        require(newMetadata.duration > 0, "Duration must be positive");

        audioMetadata[tokenId] = newMetadata;
        emit AudioMetadataUpdated(tokenId, newMetadata.title, newMetadata.artist);
    }

    /**
     * @dev Get audio metadata for a token
     * @param tokenId Token ID
     * @return Audio metadata
     */
    function getAudioMetadata(uint256 tokenId) public view returns (AudioMetadata memory) {
        require(_exists(tokenId), "Token does not exist");
        return audioMetadata[tokenId];
    }

    /**
     * @dev Check if audio hash is already minted
     * @param audioHash Audio file hash
     * @return True if already minted
     */
    function isAudioMinted(string memory audioHash) public view returns (bool) {
        return audioHashToTokenId[audioHash] != 0;
    }

    /**
     * @dev Get token ID by audio hash
     * @param audioHash Audio file hash
     * @return Token ID (0 if not found)
     */
    function getTokenIdByAudioHash(string memory audioHash) public view returns (uint256) {
        return audioHashToTokenId[audioHash];
    }

    // Admin functions
    function setMintPrice(uint256 _mintPrice) public onlyOwner {
        mintPrice = _mintPrice;
        emit MintPriceUpdated(_mintPrice);
    }

    function setMaxSupply(uint256 _maxSupply) public onlyOwner {
        require(_maxSupply >= _tokenIdCounter.current(), "Cannot decrease below current supply");
        maxSupply = _maxSupply;
        emit MaxSupplyUpdated(_maxSupply);
    }

    function setMaxMintsPerWallet(uint256 _maxMints) public onlyOwner {
        maxMintsPerWallet = _maxMints;
        emit MaxMintsPerWalletUpdated(_maxMints);
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) public onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) public onlyOwner {
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    // Override required functions
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function totalSupply() public view override returns (uint256) {
        return _tokenIdCounter.current();
    }
}