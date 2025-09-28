import React from 'react';

const NFTGallery = ({ nfts }) => {
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleDateString();
  };

  if (nfts.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 style={{ 
        marginBottom: '32px', 
        color: 'white',
        textAlign: 'center',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
      }}>
        Your Audio NFT Collection
      </h2>
      
      <div className="grid">
        {nfts.map((nft) => (
          <div key={nft.tokenId} className="nft-card">
            <div className="nft-image">
              🎵
            </div>
            <div className="nft-content">
              <h3 className="nft-title">{nft.metadata.title}</h3>
              <p className="nft-artist">by {nft.metadata.artist}</p>
              
              <div className="nft-details">
                <div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Genre</div>
                  <div style={{ fontWeight: '600' }}>{nft.metadata.genre}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Duration</div>
                  <div style={{ fontWeight: '600' }}>{formatDuration(parseInt(nft.metadata.duration))}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Format</div>
                  <div style={{ fontWeight: '600' }}>{nft.metadata.audioFormat}</div>
                </div>
              </div>

              {nft.metadata.description && (
                <p style={{ 
                  fontSize: '14px', 
                  color: '#666', 
                  marginBottom: '16px',
                  lineHeight: '1.4'
                }}>
                  {nft.metadata.description.length > 100 
                    ? `${nft.metadata.description.substring(0, 100)}...` 
                    : nft.metadata.description
                  }
                </p>
              )}

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#999'
              }}>
                <div>
                  <div>Token ID: #{nft.tokenId}</div>
                  <div>Released: {formatDate(nft.metadata.releaseDate)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>{formatFileSize(parseInt(nft.metadata.fileSize))}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn" 
                  style={{ flex: 1, fontSize: '14px', padding: '8px 12px' }}
                  onClick={() => {
                    // In a real implementation, this would open the audio player
                    alert('Audio player would open here');
                  }}
                >
                  🎧 Play
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, fontSize: '14px', padding: '8px 12px' }}
                  onClick={() => {
                    navigator.clipboard.writeText(nft.tokenURI);
                    alert('IPFS URI copied to clipboard!');
                  }}
                >
                  📋 Copy URI
                </button>
              </div>

              <div style={{ 
                marginTop: '12px', 
                padding: '8px', 
                background: '#f8f9fa', 
                borderRadius: '4px',
                fontSize: '10px',
                color: '#666',
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}>
                IPFS: {nft.tokenURI}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        textAlign: 'center', 
        marginTop: '32px',
        color: 'white',
        opacity: 0.8
      }}>
        <p>🎵 {nfts.length} Audio NFT{nfts.length !== 1 ? 's' : ''} in your collection</p>
      </div>
    </div>
  );
};

export default NFTGallery;