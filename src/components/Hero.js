import React from 'react';

const Hero = () => {
  return (
    <section className="hero">
      <div className="container">
        <h1>Turn Your Music Into NFTs</h1>
        <p>
          Transform your WAV and MP3 files into unique, tradeable digital assets on the blockchain.
          Own your music, control your royalties, and build your collection.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            padding: '16px 24px', 
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}>
            <strong>🎵 Audio Formats:</strong> WAV, MP3, FLAC, AAC
          </div>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            padding: '16px 24px', 
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}>
            <strong>⚡ Fast Minting:</strong> Deploy in seconds
          </div>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            padding: '16px 24px', 
            borderRadius: '8px',
            backdropFilter: 'blur(10px)'
          }}>
            <strong>🔒 Secure:</strong> IPFS + Blockchain
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;