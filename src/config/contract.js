// Contract configuration
// This file will be updated with actual contract addresses after deployment

export const contractAddress = "0x0000000000000000000000000000000000000000"; // Update after deployment

export const contractABI = [
  // ERC721 standard functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  
  // Crypto Sounds specific functions
  "function mintPrice() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function mintingEnabled() view returns (bool)",
  "function royaltyPercentage() view returns (uint256)",
  "function royaltyRecipient() view returns (address)",
  
  "function mintAudioNFT(address to, string memory audioFileURI, tuple(string title, string artist, string genre, uint256 duration, string audioFormat, uint256 fileSize, string description, uint256 releaseDate) metadata) payable returns (uint256)",
  "function batchMintAudioNFTs(address to, string[] memory audioFileURIs, tuple(string title, string artist, string genre, uint256 duration, string audioFormat, uint256 fileSize, string description, uint256 releaseDate)[] memory metadataArray) payable returns (uint256[])",
  "function getAudioMetadata(uint256 tokenId) view returns (tuple(string title, string artist, string genre, uint256 duration, string audioFormat, uint256 fileSize, string description, uint256 releaseDate))",
  
  // Admin functions (owner only)
  "function setMintPrice(uint256 _mintPrice)",
  "function setMaxSupply(uint256 _maxSupply)",
  "function toggleMinting()",
  "function updateRoyalty(uint256 _percentage, address _recipient)",
  "function withdraw()",
  
  // Royalty standard (EIP-2981)
  "function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address, uint256)",
  
  // Events
  "event AudioNFTMinted(uint256 indexed tokenId, address indexed owner, string title, string artist, string audioFormat, uint256 duration)",
  "event MintPriceUpdated(uint256 newPrice)",
  "event MaxSupplyUpdated(uint256 newMaxSupply)",
  "event MintingToggled(bool enabled)",
  "event RoyaltyUpdated(uint256 newPercentage, address newRecipient)",
  
  // Transfer events
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)"
];

// Network configurations
export const networks = {
  1: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
    explorerUrl: "https://etherscan.io"
  },
  11155111: {
    name: "Sepolia Testnet",
    chainId: 11155111,
    rpcUrl: "https://sepolia.infura.io/v3/YOUR_PROJECT_ID",
    explorerUrl: "https://sepolia.etherscan.io"
  },
  1337: {
    name: "Local Hardhat",
    chainId: 1337,
    rpcUrl: "http://localhost:8545",
    explorerUrl: "http://localhost:8545"
  }
};

// IPFS configuration
export const ipfsConfig = {
  gateway: "https://ipfs.io/ipfs/",
  pinataApiKey: process.env.REACT_APP_PINATA_API_KEY || "",
  pinataSecretKey: process.env.REACT_APP_PINATA_SECRET_KEY || "",
  pinataGateway: "https://gateway.pinata.cloud/ipfs/"
};

// Default minting configuration
export const defaultConfig = {
  mintPrice: "0.01", // ETH
  maxSupply: 10000,
  royaltyPercentage: 5, // 5%
  supportedFormats: ["WAV", "MP3", "FLAC", "AAC", "OGG", "M4A"],
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxDuration: 36000 // 10 hours in seconds
};