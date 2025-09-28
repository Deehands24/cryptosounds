import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Header from './components/Header';
import Hero from './components/Hero';
import MintingInterface from './components/MintingInterface';
import NFTGallery from './components/NFTGallery';
import { contractAddress, contractABI } from './config/contract';

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [network, setNetwork] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nfts, setNfts] = useState([]);

  // Check if MetaMask is installed
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      setProvider(new ethers.BrowserProvider(window.ethereum));
    } else {
      console.warn('MetaMask is not installed!');
    }
  }, []);

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      setLoading(true);
      
      if (!window.ethereum) {
        alert('Please install MetaMask to use this app!');
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contractInstance = new ethers.Contract(contractAddress, contractABI, signer);
        
        setAccount(accounts[0]);
        setProvider(provider);
        setContract(contractInstance);
        setIsConnected(true);

        // Get network info
        const network = await provider.getNetwork();
        setNetwork(network);

        // Load user's NFTs
        await loadUserNFTs(contractInstance, accounts[0]);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load user's NFTs
  const loadUserNFTs = async (contractInstance, userAddress) => {
    try {
      const balance = await contractInstance.balanceOf(userAddress);
      const nftPromises = [];

      for (let i = 0; i < balance; i++) {
        const tokenId = await contractInstance.tokenOfOwnerByIndex(userAddress, i);
        const tokenURI = await contractInstance.tokenURI(tokenId);
        const metadata = await contractInstance.getAudioMetadata(tokenId);
        
        nftPromises.push({
          tokenId: tokenId.toString(),
          tokenURI,
          metadata: {
            title: metadata.title,
            artist: metadata.artist,
            genre: metadata.genre,
            duration: metadata.duration.toString(),
            audioFormat: metadata.audioFormat,
            fileSize: metadata.fileSize.toString(),
            description: metadata.description,
            releaseDate: metadata.releaseDate.toString()
          }
        });
      }

      const userNFTs = await Promise.all(nftPromises);
      setNfts(userNFTs);
    } catch (error) {
      console.error('Error loading NFTs:', error);
    }
  };

  // Handle account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          if (contract) {
            loadUserNFTs(contract, accounts[0]);
          }
        } else {
          setAccount(null);
          setContract(null);
          setIsConnected(false);
          setNfts([]);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [contract]);

  return (
    <div className="App">
      <Header 
        account={account} 
        isConnected={isConnected}
        onConnect={connectWallet}
        loading={loading}
        network={network}
      />
      
      <Hero />
      
      <main className="section">
        <div className="container">
          {!isConnected ? (
            <div className="card">
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <h2 style={{ marginBottom: '16px', color: '#333' }}>
                  Connect Your Wallet to Get Started
                </h2>
                <p style={{ marginBottom: '24px', color: '#666' }}>
                  Connect your MetaMask wallet to mint audio NFTs and manage your collection.
                </p>
                <button 
                  className="btn" 
                  onClick={connectWallet}
                  disabled={loading}
                >
                  {loading ? <span className="loading"></span> : 'Connect Wallet'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <MintingInterface 
                contract={contract}
                account={account}
                onNFTMinted={() => loadUserNFTs(contract, account)}
              />
              
              {nfts.length > 0 && (
                <NFTGallery nfts={nfts} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;