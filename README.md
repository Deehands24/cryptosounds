# Crypto Sounds - Audio NFT Marketplace

Transform your WAV and MP3 files into unique, tradeable digital assets on the blockchain. Crypto Sounds enables musicians and audio creators to mint their work as NFTs with comprehensive metadata and decentralized storage.

## Features

### 🎵 Audio NFT Minting
- Support for WAV, MP3, FLAC, AAC, OGG, and M4A formats
- Comprehensive metadata including title, artist, genre, duration, and more
- Decentralized storage on IPFS
- Batch minting capabilities
- Customizable mint prices and royalties

### 🔒 Smart Contracts
- ERC-721 compliant NFT contract
- EIP-2981 royalty standard support
- Advanced metadata validation
- Owner controls and security features
- Gas-optimized implementation

### 🎨 Frontend Interface
- React-based minting interface
- Drag-and-drop audio file upload
- Real-time metadata editing
- NFT collection gallery
- MetaMask wallet integration

### ☁️ IPFS Integration
- Decentralized file storage
- Pinata service integration
- Metadata JSON standards
- Content addressing and verification

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- MetaMask wallet
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cryptosounds
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   - Add your private key for deployment
   - Configure Infura/Alchemy endpoints
   - Add Pinata API keys for IPFS
   - Set Etherscan API key for verification

### Local Development

1. **Start local blockchain**
   ```bash
   npx hardhat node
   ```

2. **Deploy contracts**
   ```bash
   npm run deploy:local
   ```

3. **Start frontend**
   ```bash
   npm run frontend
   ```

4. **Connect MetaMask**
   - Add local network (http://localhost:8545, Chain ID: 1337)
   - Import test accounts from Hardhat output

### Testing

```bash
# Run smart contract tests
npm test

# Compile contracts
npm run compile
```

## Smart Contracts

### CryptoSoundsNFT.sol
Main NFT contract with features:
- Audio file minting with metadata
- Batch minting support
- Royalty management (EIP-2981)
- Owner controls and security
- Gas-optimized operations

### AudioMetadata.sol
Metadata validation contract:
- Audio format validation
- Quality level verification
- Comprehensive metadata structure
- Content validation rules

## Frontend Components

### MintingInterface
Complete minting workflow:
1. Audio file upload with drag-and-drop
2. Metadata form with validation
3. IPFS upload with progress tracking
4. Smart contract interaction

### NFTGallery
Collection management:
- Display user's audio NFTs
- Playback integration
- IPFS URI access
- Metadata display

## IPFS Integration

### Configuration
Set up Pinata account and add API keys to environment:
```bash
REACT_APP_PINATA_API_KEY=your_api_key
REACT_APP_PINATA_SECRET_KEY=your_secret_key
```

### Upload Process
1. Audio file uploaded to IPFS
2. Metadata JSON created with NFT standards
3. Metadata uploaded separately
4. IPFS hash returned for smart contract

## Deployment

### Testnet Deployment (Sepolia)

1. **Get testnet ETH**
   - Visit [Sepolia Faucet](https://sepoliafaucet.com/)
   - Add ETH to your wallet

2. **Deploy contracts**
   ```bash
   npm run deploy
   ```

3. **Update frontend config**
   - Copy contract addresses from deployment output
   - Update `src/config/contract.js`

4. **Verify contracts**
   ```bash
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
   ```

### Mainnet Deployment

⚠️ **Important**: Test thoroughly on testnets before mainnet deployment.

1. **Update configuration**
   - Set mainnet RPC URL
   - Ensure sufficient ETH for gas
   - Double-check all parameters

2. **Deploy**
   ```bash
   npx hardhat run scripts/deploy.js --network mainnet
   ```

3. **Verify and update**
   - Verify contracts on Etherscan
   - Update frontend configuration
   - Test all functionality

## Usage Guide

### Minting Audio NFTs

1. **Connect Wallet**
   - Click "Connect Wallet" in header
   - Approve MetaMask connection

2. **Upload Audio File**
   - Drag and drop or click to browse
   - Supported formats: WAV, MP3, FLAC, AAC, OGG, M4A
   - Maximum file size: 100MB

3. **Add Metadata**
   - Fill in title, artist, genre (required)
   - Add description, tags, release date
   - Review duration and file info

4. **Upload to IPFS**
   - Files automatically uploaded to decentralized storage
   - Progress tracking during upload
   - IPFS hash generated

5. **Mint NFT**
   - Review preview and metadata
   - Pay minting fee (default: 0.01 ETH)
   - Confirm transaction in MetaMask
   - NFT appears in your collection

### Managing NFTs

- **View Collection**: All minted NFTs appear in gallery
- **Play Audio**: Click play button (requires audio player integration)
- **Copy IPFS URI**: Access decentralized content
- **Transfer**: Use standard NFT transfer methods

## Configuration

### Smart Contract Parameters
- `mintPrice`: Cost to mint new NFT (default: 0.01 ETH)
- `maxSupply`: Maximum number of NFTs (default: 10,000)
- `royaltyPercentage`: Creator royalty (default: 5%)
- `mintingEnabled`: Toggle minting on/off

### Frontend Configuration
- Contract addresses in `src/config/contract.js`
- Network configurations
- IPFS gateway settings
- Default parameters

## Security Considerations

### Smart Contracts
- Owner-only functions protected
- Reentrancy guards implemented
- Input validation for all parameters
- Gas optimization for cost efficiency

### Frontend
- MetaMask integration with error handling
- Input validation and sanitization
- Secure API key management
- Transaction confirmation flows

## Troubleshooting

### Common Issues

**MetaMask Connection Failed**
- Ensure MetaMask is installed and unlocked
- Check network configuration
- Refresh page and retry

**IPFS Upload Failed**
- Verify Pinata API keys are correct
- Check file size limits (100MB max)
- Ensure stable internet connection

**Transaction Failed**
- Check wallet has sufficient ETH for gas
- Verify contract is deployed on current network
- Increase gas limit if needed

**Audio Not Playing**
- Verify IPFS hash is correct
- Check audio format compatibility
- Ensure IPFS gateway is accessible

### Support

For technical support:
1. Check console logs for error messages
2. Verify all environment variables are set
3. Ensure contracts are deployed and verified
4. Test on local network first

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Roadmap

### Phase 1 ✅
- Basic NFT minting
- IPFS integration
- Frontend interface
- Smart contract deployment

### Phase 2 🚧
- Audio player integration
- Advanced metadata features
- Batch operations
- Marketplace integration

### Phase 3 📋
- Royalty distribution
- Social features
- Analytics dashboard
- Mobile app

---

**Built with ❤️ for the music and blockchain communities**