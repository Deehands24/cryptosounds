import React, { useState } from 'react';
import { uploadAudioToIPFS } from '../utils/ipfs';

const IPFSUpload = ({ audioFile, metadata, onUpload, onBack }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [ipfsHash, setIpfsHash] = useState('');

  // Upload to IPFS using the IPFS service
  const uploadToIPFS = async () => {
    try {
      setUploading(true);
      setError('');
      setUploadProgress(0);

      // Use the real IPFS service to upload audio and metadata
      const result = await uploadAudioToIPFS(audioFile, metadata, {
        onProgress: (progress) => {
          setUploadProgress(progress);
        }
      });

      setIpfsHash(result.metadataHash);
      onUpload(result.metadataHash);

    } catch (error) {
      console.error('IPFS upload error:', error);
      setError(`Failed to upload to IPFS: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = () => {
    setIpfsHash('');
    setUploadProgress(0);
    setError('');
    uploadToIPFS();
  };

  return (
    <div>
      <h3 style={{ marginBottom: '16px', color: '#333' }}>Step 3: Upload to IPFS</h3>
      
      <div className="alert alert-info">
        <strong>About IPFS:</strong> Your audio file and metadata will be stored on the InterPlanetary File System (IPFS), 
        a decentralized storage network that ensures your content is always accessible.
      </div>

      {!ipfsHash ? (
        <div>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '24px', 
            borderRadius: '8px', 
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>☁️</div>
            <h4 style={{ marginBottom: '16px', color: '#333' }}>
              Ready to Upload to IPFS
            </h4>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              Your audio file and metadata will be uploaded to decentralized storage.
            </p>

            {uploading ? (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    background: '#e1e5e9', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${uploadProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                    Uploading... {uploadProgress}%
                  </div>
                </div>
                <p style={{ color: '#667eea' }}>Please wait while we upload your files...</p>
              </div>
            ) : (
              <div>
                <button className="btn" onClick={uploadToIPFS}>
                  Upload to IPFS
                </button>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '16px' }}>
                  This may take a few moments depending on file size
                </p>
              </div>
            )}

            {error && (
              <div className="alert alert-error" style={{ marginTop: '16px' }}>
                {error}
                <button 
                  className="btn btn-secondary" 
                  onClick={handleRetry}
                  style={{ marginTop: '8px' }}
                >
                  Retry Upload
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onBack}>
              Back
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="alert alert-success">
            <strong>Upload Successful!</strong> Your files have been uploaded to IPFS.
          </div>
          
          <div style={{ 
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '24px' 
          }}>
            <h4 style={{ marginBottom: '16px', color: '#333' }}>IPFS Details</h4>
            <div style={{ marginBottom: '12px' }}>
              <strong>Metadata Hash:</strong>
              <div style={{ 
                background: 'white', 
                padding: '8px', 
                borderRadius: '4px', 
                fontFamily: 'monospace',
                fontSize: '14px',
                wordBreak: 'break-all',
                marginTop: '4px'
              }}>
                {ipfsHash}
              </div>
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              This hash represents your audio file and metadata on the IPFS network.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={handleRetry}>
              Upload Different File
            </button>
            <button className="btn" onClick={() => onUpload(ipfsHash)}>
              Continue to Minting
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPFSUpload;