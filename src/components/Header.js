import React from 'react';

const Header = ({ account, isConnected, onConnect, loading, network }) => {
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (network) => {
    if (!network) return 'Unknown';
    return network.name || `Chain ID: ${network.chainId}`;
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <a href="/" className="logo">
            🎵 Crypto Sounds
          </a>
          
          <div className="wallet-info">
            {isConnected ? (
              <>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    {getNetworkName(network)}
                  </div>
                  <div className="wallet-address">
                    {formatAddress(account)}
                  </div>
                </div>
                <button className="btn btn-secondary" onClick={() => window.location.reload()}>
                  Disconnect
                </button>
              </>
            ) : (
              <button 
                className="btn" 
                onClick={onConnect}
                disabled={loading}
              >
                {loading ? <span className="loading"></span> : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;