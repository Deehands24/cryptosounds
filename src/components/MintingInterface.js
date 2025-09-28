import React, { useState } from 'react';
import { ethers } from 'ethers';
import AudioFileUpload from './AudioFileUpload';
import MetadataForm from './MetadataForm';
import IPFSUpload from './IPFSUpload';

const MintingInterface = ({ contract, account, onNFTMinted }) => {
  const [step, setStep] = useState(1);
  const [audioFile, setAudioFile] = useState(null);
  const [metadata, setMetadata] = useState({
    title: '',
    artist: '',
    genre: '',
    description: '',
    duration: 0,
    audioFormat: '',
    fileSize: 0,
    releaseDate: Math.floor(Date.now() / 1000),
    tags: []
  });
  const [ipfsHash, setIpfsHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAudioFileSelect = (file) => {
    setAudioFile(file);
    
    // Extract metadata from file
    const reader = new FileReader();
    reader.onload = (e) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        setMetadata(prev => ({
          ...prev,
          audioFormat: file.type.split('/')[1].toUpperCase(),
          fileSize: file.size,
          duration: Math.floor(audio.duration) || 0
        }));
      };
      audio.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    setStep(2);
  };

  const handleMetadataSubmit = (formMetadata) => {
    setMetadata(formMetadata);
    setStep(3);
  };

  const handleIPFSUpload = (hash) => {
    setIpfsHash(hash);
    setStep(4);
  };

  const mintNFT = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Get mint price
      const mintPrice = await contract.mintPrice();
      
      // Prepare metadata for contract
      const contractMetadata = {
        title: metadata.title,
        artist: metadata.artist,
        genre: metadata.genre,
        duration: metadata.duration,
        audioFormat: metadata.audioFormat,
        fileSize: metadata.fileSize,
        description: metadata.description,
        releaseDate: metadata.releaseDate
      };

      // Mint the NFT
      const tx = await contract.mintAudioNFT(
        account,
        `ipfs://${ipfsHash}`,
        contractMetadata,
        { value: mintPrice }
      );

      setSuccess('Transaction sent! Waiting for confirmation...');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        setSuccess('🎉 NFT minted successfully! Check your collection below.');
        onNFTMinted();
        
        // Reset form
        setTimeout(() => {
          setStep(1);
          setAudioFile(null);
          setMetadata({
            title: '',
            artist: '',
            genre: '',
            description: '',
            duration: 0,
            audioFormat: '',
            fileSize: 0,
            releaseDate: Math.floor(Date.now() / 1000),
            tags: []
          });
          setIpfsHash('');
          setSuccess('');
        }, 3000);
      }
    } catch (error) {
      console.error('Minting error:', error);
      setError(`Minting failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setAudioFile(null);
    setMetadata({
      title: '',
      artist: '',
      genre: '',
      description: '',
      duration: 0,
      audioFormat: '',
      fileSize: 0,
      releaseDate: Math.floor(Date.now() / 1000),
      tags: []
    });
    setIpfsHash('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '24px', color: '#333' }}>
        Mint Audio NFT
      </h2>

      {/* Progress Steps */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '32px',
        position: 'relative'
      }}>
        {[1, 2, 3, 4].map((stepNum) => (
          <div key={stepNum} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            flex: 1
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: step >= stepNum ? '#667eea' : '#e1e5e9',
              color: step >= stepNum ? 'white' : '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              {stepNum}
            </div>
            <span style={{ 
              fontSize: '12px', 
              color: step >= stepNum ? '#667eea' : '#666',
              textAlign: 'center'
            }}>
              {stepNum === 1 && 'Upload Audio'}
              {stepNum === 2 && 'Add Metadata'}
              {stepNum === 3 && 'Upload to IPFS'}
              {stepNum === 4 && 'Mint NFT'}
            </span>
          </div>
        ))}
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* Step Content */}
      {step === 1 && (
        <AudioFileUpload onFileSelect={handleAudioFileSelect} />
      )}

      {step === 2 && audioFile && (
        <MetadataForm 
          audioFile={audioFile}
          initialMetadata={metadata}
          onSubmit={handleMetadataSubmit}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <IPFSUpload 
          audioFile={audioFile}
          metadata={metadata}
          onUpload={handleIPFSUpload}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && ipfsHash && (
        <div>
          <div className="alert alert-info">
            <strong>Ready to mint!</strong> Your audio file has been uploaded to IPFS with hash: <code>{ipfsHash}</code>
          </div>
          
          <div style={{ 
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '24px' 
          }}>
            <h3 style={{ marginBottom: '16px', color: '#333' }}>NFT Preview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div>
                <div style={{ 
                  background: 'linear-gradient(45deg, #667eea, #764ba2)', 
                  height: '120px', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px'
                }}>
                  🎵
                </div>
              </div>
              <div>
                <h4 style={{ marginBottom: '8px', color: '#333' }}>{metadata.title}</h4>
                <p style={{ color: '#666', marginBottom: '8px' }}>by {metadata.artist}</p>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  {metadata.audioFormat} • {Math.floor(metadata.duration / 60)}:{(metadata.duration % 60).toString().padStart(2, '0')} • {metadata.genre}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)}>
              Back
            </button>
            <button 
              className="btn" 
              onClick={mintNFT}
              disabled={loading}
            >
              {loading ? <span className="loading"></span> : 'Mint NFT'}
            </button>
          </div>
        </div>
      )}

      {/* Reset Button */}
      {step > 1 && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={resetForm}
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
};

export default MintingInterface;