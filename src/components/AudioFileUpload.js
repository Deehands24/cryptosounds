import React, { useState } from 'react';

const AudioFileUpload = ({ onFileSelect }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const supportedFormats = ['audio/wav', 'audio/mp3', 'audio/flac', 'audio/aac', 'audio/ogg', 'audio/m4a'];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file) => {
    if (!supportedFormats.includes(file.type)) {
      alert('Unsupported file format. Please select a WAV, MP3, FLAC, AAC, OGG, or M4A file.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      alert('File size too large. Please select a file smaller than 100MB.');
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <h3 style={{ marginBottom: '16px', color: '#333' }}>Step 1: Upload Audio File</h3>
      
      <div
        className={`file-upload ${dragActive ? 'dragover' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('audio-file-input').click()}
      >
        <input
          id="audio-file-input"
          type="file"
          accept=".wav,.mp3,.flac,.aac,.ogg,.m4a,audio/*"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        
        {selectedFile ? (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎵</div>
            <h4 style={{ marginBottom: '8px', color: '#333' }}>{selectedFile.name}</h4>
            <p style={{ color: '#666', marginBottom: '8px' }}>
              {formatFileSize(selectedFile.size)}
            </p>
            <p style={{ color: '#667eea', fontSize: '14px' }}>
              Click to change file
            </p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎵</div>
            <h4 style={{ marginBottom: '8px', color: '#333' }}>
              Drag & drop your audio file here
            </h4>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              or click to browse
            </p>
            <div style={{ 
              fontSize: '12px', 
              color: '#999',
              background: 'rgba(255,255,255,0.5)',
              padding: '8px',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              Supported: WAV, MP3, FLAC, AAC, OGG, M4A (max 100MB)
            </div>
          </div>
        )}
      </div>

      {selectedFile && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button className="btn" onClick={() => onFileSelect(selectedFile)}>
            Continue to Metadata
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioFileUpload;