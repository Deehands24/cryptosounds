# CryptoSounds NFT System

A comprehensive NFT minting system for audio files (WAV, MP3) with marketplace and royalty management capabilities.

## 🎵 Features

### Core NFT Contract (`CryptoSoundsNFT`)
- **Audio File Minting**: Convert WAV and MP3 files into true NFTs
- **Rich Metadata**: Store comprehensive audio metadata including title, artist, album, genre, duration, format, and more
- **Duplicate Prevention**: Prevent minting of the same audio file multiple times
- **Batch Minting**: Mint multiple audio NFTs in a single transaction
- **Metadata Updates**: Allow token owners to update their audio metadata
- **Royalty Support**: Built-in EIP-2981 royalty standard support
- **Minting Limits**: Configurable limits per wallet and total supply
- **Pausable**: Emergency pause functionality for security

### Marketplace Contract (`CryptoSoundsMarketplace`)
- **Fixed Price Listings**: List NFTs for sale at fixed prices
- **Offer System**: Make offers on NFTs with expiration times
- **Auction System**: Create timed auctions with bidding
- **Fee Management**: Configurable marketplace and listing fees
- **Automatic Transfers**: Secure NFT transfers upon purchase
- **Refund System**: Automatic refunds for excess payments

### Royalty Management (`CryptoSoundsRoyalty`)
- **Multi-Recipient Royalties**: Support for multiple royalty recipients (artist, producer, label, etc.)
- **Flexible Percentages**: Configurable royalty percentages per recipient
- **Role-Based Distribution**: Assign specific roles to royalty recipients
- **Platform Fees**: Built-in platform fee system
- **Automatic Distribution**: Automated royalty distribution on sales
- **Royalty Calculation**: Real-time royalty calculation tools

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Hardhat
- Ethereum wallet with test ETH

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd cryptosounds-nft
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Compile contracts:**
```bash
npm run compile
```

4. **Run tests:**
```bash
npm test
```

5. **Deploy to local network:**
```bash
npx hardhat node
# In another terminal:
npm run deploy
```

### Deployment

#### Local Development
```bash
# Start local Hardhat network
npx hardhat node

# Deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

#### Testnet (Sepolia)
```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network testnet

# Verify contracts
npx hardhat run scripts/verify.js --network testnet <nft_address> <marketplace_address> <royalty_address>
```

#### Mainnet
```bash
# Deploy to Ethereum mainnet
npx hardhat run scripts/deploy.js --network mainnet

# Verify contracts
npx hardhat run scripts/verify.js --network mainnet <nft_address> <marketplace_address> <royalty_address>
```

## 📖 Usage Examples

### Minting an Audio NFT

```javascript
const audioMetadata = {
  title: "My Amazing Song",
  artist: "Crypto Artist",
  album: "Blockchain Beats",
  genre: "Electronic",
  duration: 240, // 4 minutes in seconds
  audioFormat: "WAV",
  audioHash: "QmYourAudioFileHash", // IPFS hash
  coverImageHash: "QmYourCoverImageHash", // IPFS hash
  releaseDate: Math.floor(Date.now() / 1000),
  isExplicit: false
};

const tokenURI = "https://ipfs.io/ipfs/QmYourMetadataHash";

await nftContract.mintAudioNFT(
  recipientAddress,
  audioMetadata,
  tokenURI,
  { value: mintPrice }
);
```

### Setting Up Royalties

```javascript
const recipients = [artistAddress, producerAddress];
const percentages = [400, 200]; // 4% and 2%
const roles = ["artist", "producer"];

await royaltyContract.setTokenRoyalty(
  nftContractAddress,
  tokenId,
  recipients,
  percentages,
  roles
);
```

### Listing an NFT for Sale

```javascript
// Approve marketplace to transfer NFT
await nftContract.approve(marketplaceAddress, tokenId);

// List for sale
await marketplace.listItem(
  nftContractAddress,
  tokenId,
  ethers.parseEther("1.0"), // 1 ETH
  0, // no expiration
  { value: listingFee }
);
```

### Creating an Auction

```javascript
await marketplace.createAuction(
  nftContractAddress,
  tokenId,
  ethers.parseEther("0.5"), // starting price
  7 * 24 * 60 * 60, // 7 days duration
  { value: listingFee }
);
```

## 🔧 Configuration

### Contract Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxSupply` | 10,000 | Maximum number of NFTs that can be minted |
| `mintPrice` | 0.1 ETH | Price to mint a new NFT |
| `maxMintsPerWallet` | 5 | Maximum NFTs one wallet can mint |
| `marketplaceFee` | 2.5% | Fee charged by marketplace on sales |
| `listingFee` | 0.01 ETH | Fee to list an item for sale |
| `platformFee` | 0.25% | Platform fee for royalty distribution |
| `maxRoyalty` | 10% | Maximum total royalty percentage |

### Environment Variables

```bash
# Network Configuration
TESTNET_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY

# Private Key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/CryptoSoundsNFT.test.js

# Run with gas reporting
REPORT_GAS=true npm test

# Run with coverage
npm run coverage
```

## 📁 Project Structure

```
cryptosounds-nft/
├── contracts/
│   ├── CryptoSoundsNFT.sol          # Main NFT contract
│   ├── CryptoSoundsMarketplace.sol  # Marketplace contract
│   └── CryptoSoundsRoyalty.sol      # Royalty management contract
├── scripts/
│   ├── deploy.js                    # Deployment script
│   ├── verify.js                    # Contract verification
│   ├── mint-example.js              # Minting example
│   ├── setup-royalties.js           # Royalty setup example
│   └── marketplace-demo.js          # Marketplace demo
├── test/
│   ├── CryptoSoundsNFT.test.js      # NFT contract tests
│   ├── CryptoSoundsMarketplace.test.js # Marketplace tests
│   └── CryptoSoundsRoyalty.test.js  # Royalty contract tests
├── deployments/                     # Deployment records
├── hardhat.config.js               # Hardhat configuration
├── package.json                    # Dependencies and scripts
└── README.md                       # This file
```

## 🔒 Security Features

- **Reentrancy Protection**: All external calls are protected against reentrancy attacks
- **Access Control**: Role-based access control for administrative functions
- **Pausable Contracts**: Emergency pause functionality for security incidents
- **Input Validation**: Comprehensive validation of all inputs
- **Safe Transfers**: Secure NFT transfers using OpenZeppelin's safe transfer functions
- **Fee Limits**: Maximum fee limits to prevent excessive charges

## 🌐 IPFS Integration

The system is designed to work with IPFS for storing:
- Audio files (WAV, MP3)
- Cover images
- Metadata JSON files

### Recommended IPFS Setup

1. **Pinata**: For reliable IPFS pinning service
2. **Infura IPFS**: For decentralized storage
3. **Local IPFS Node**: For development

### Metadata JSON Format

```json
{
  "name": "My Amazing Song",
  "description": "A revolutionary audio NFT",
  "image": "https://ipfs.io/ipfs/QmCoverImageHash",
  "audio": "https://ipfs.io/ipfs/QmAudioFileHash",
  "attributes": [
    {
      "trait_type": "Artist",
      "value": "Crypto Artist"
    },
    {
      "trait_type": "Genre",
      "value": "Electronic"
    },
    {
      "trait_type": "Duration",
      "value": "4:00"
    },
    {
      "trait_type": "Format",
      "value": "WAV"
    }
  ]
}
```

## 📊 Gas Optimization

The contracts are optimized for gas efficiency:
- **Batch Operations**: Batch minting and royalty distribution
- **Storage Optimization**: Efficient storage patterns
- **Function Optimization**: Optimized function implementations
- **Compiler Settings**: Optimized Solidity compiler settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the test files for usage examples

## 🔮 Roadmap

- [ ] Multi-chain deployment support
- [ ] Advanced auction features (reserve prices, buy-it-now)
- [ ] Social features (likes, comments, shares)
- [ ] Analytics dashboard
- [ ] Mobile app integration
- [ ] Advanced royalty splitting (time-based, percentage-based)
- [ ] Integration with music streaming platforms

---

**Built with ❤️ for the crypto music community**