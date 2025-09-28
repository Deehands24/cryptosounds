import axios from 'axios';
import { ipfsConfig } from '../config/contract';

class IPFSService {
  constructor() {
    this.pinataApiKey = ipfsConfig.pinataApiKey;
    this.pinataSecretKey = ipfsConfig.pinataSecretKey;
    this.pinataGateway = ipfsConfig.pinataGateway;
    this.ipfsGateway = ipfsConfig.gateway;
  }

  // Upload file to IPFS using Pinata (requires API keys)
  async uploadToPinata(file, metadata = {}) {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new Error('Pinata API keys not configured. Please set REACT_APP_PINATA_API_KEY and REACT_APP_PINATA_SECRET_KEY environment variables.');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata
      if (Object.keys(metadata).length > 0) {
        formData.append('pinataMetadata', JSON.stringify({
          name: metadata.name || file.name,
          keyvalues: metadata.keyvalues || {}
        }));
      }

      // Pin options
      formData.append('pinataOptions', JSON.stringify({
        cidVersion: 1
      }));

      const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (metadata.onProgress) {
            metadata.onProgress(percentCompleted);
          }
        }
      });

      return response.data.IpfsHash;
    } catch (error) {
      console.error('Pinata upload error:', error);
      throw new Error(`Failed to upload to Pinata: ${error.response?.data?.error || error.message}`);
    }
  }

  // Upload JSON metadata to IPFS using Pinata
  async uploadJSONToPinata(jsonData, name = 'metadata.json') {
    if (!this.pinataApiKey || !this.pinataSecretKey) {
      throw new Error('Pinata API keys not configured');
    }

    try {
      const response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        pinataContent: jsonData,
        pinataMetadata: {
          name: name
        },
        pinataOptions: {
          cidVersion: 1
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        }
      });

      return response.data.IpfsHash;
    } catch (error) {
      console.error('Pinata JSON upload error:', error);
      throw new Error(`Failed to upload JSON to Pinata: ${error.response?.data?.error || error.message}`);
    }
  }

  // Upload audio file and metadata as a complete NFT package
  async uploadAudioNFT(audioFile, metadata, options = {}) {
    try {
      const { onProgress } = options;
      
      // Step 1: Upload audio file
      if (onProgress) onProgress(10);
      const audioHash = await this.uploadToPinata(audioFile, {
        name: `audio-${metadata.title}-${Date.now()}`,
        onProgress: (progress) => {
          if (onProgress) onProgress(10 + (progress * 0.4)); // Audio upload takes 40% of total progress
        }
      });

      // Step 2: Prepare metadata JSON
      if (onProgress) onProgress(50);
      const nftMetadata = {
        name: metadata.title,
        description: metadata.description,
        image: "ipfs://placeholder-cover-art", // This would be uploaded separately if cover art is provided
        external_url: "https://cryptosounds.app",
        attributes: [
          {
            trait_type: "Artist",
            value: metadata.artist
          },
          {
            trait_type: "Genre",
            value: metadata.genre
          },
          {
            trait_type: "Duration",
            value: `${Math.floor(metadata.duration / 60)}:${(metadata.duration % 60).toString().padStart(2, '0')}`
          },
          {
            trait_type: "Audio Format",
            value: metadata.audioFormat
          },
          {
            trait_type: "File Size",
            value: `${(metadata.fileSize / 1024 / 1024).toFixed(2)} MB`
          },
          {
            trait_type: "Release Date",
            value: new Date(metadata.releaseDate * 1000).toLocaleDateString()
          }
        ],
        audio: `ipfs://${audioHash}`,
        animation_url: `ipfs://${audioHash}`, // For NFT marketplaces that support audio
        ...metadata.tags && metadata.tags.length > 0 && {
          tags: metadata.tags
        }
      };

      // Step 3: Upload metadata JSON
      if (onProgress) onProgress(80);
      const metadataHash = await this.uploadJSONToPinata(nftMetadata, `metadata-${metadata.title}-${Date.now()}.json`);

      if (onProgress) onProgress(100);

      return {
        audioHash,
        metadataHash,
        audioUrl: this.getIPFSUrl(audioHash),
        metadataUrl: this.getIPFSUrl(metadataHash)
      };
    } catch (error) {
      console.error('Audio NFT upload error:', error);
      throw error;
    }
  }

  // Get IPFS URL from hash
  getIPFSUrl(hash, gateway = null) {
    const gatewayUrl = gateway || this.ipfsGateway;
    return `${gatewayUrl}${hash}`;
  }

  // Fetch content from IPFS
  async fetchFromIPFS(hash, gateway = null) {
    try {
      const url = this.getIPFSUrl(hash, gateway);
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('IPFS fetch error:', error);
      throw new Error(`Failed to fetch from IPFS: ${error.message}`);
    }
  }

  // Validate IPFS hash format
  validateIPFSHash(hash) {
    // Basic validation for IPFS hash (CID)
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash) || /^bafy[a-z2-7]{52}$/.test(hash);
  }

  // Create a mock upload for development/testing
  async mockUpload(audioFile, metadata, options = {}) {
    const { onProgress } = options;
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (onProgress) onProgress(i);
    }

    // Generate mock hashes
    const mockAudioHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const mockMetadataHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    return {
      audioHash: mockAudioHash,
      metadataHash: mockMetadataHash,
      audioUrl: this.getIPFSUrl(mockAudioHash),
      metadataUrl: this.getIPFSUrl(mockMetadataHash)
    };
  }
}

// Create singleton instance
const ipfsService = new IPFSService();

export default ipfsService;

// Export utility functions
export const uploadAudioToIPFS = (audioFile, metadata, options = {}) => {
  return ipfsService.uploadAudioNFT(audioFile, metadata, options);
};

export const uploadToIPFS = (file, metadata = {}) => {
  return ipfsService.uploadToPinata(file, metadata);
};

export const uploadJSONToIPFS = (jsonData, name) => {
  return ipfsService.uploadJSONToPinata(jsonData, name);
};

export const getIPFSUrl = (hash, gateway) => {
  return ipfsService.getIPFSUrl(hash, gateway);
};

export const fetchFromIPFS = (hash, gateway) => {
  return ipfsService.fetchFromIPFS(hash, gateway);
};

export const validateIPFSHash = (hash) => {
  return ipfsService.validateIPFSHash(hash);
};