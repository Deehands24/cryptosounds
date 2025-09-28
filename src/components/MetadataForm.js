import React, { useState, useEffect } from 'react';

const MetadataForm = ({ audioFile, initialMetadata, onSubmit, onBack }) => {
  const [formData, setFormData] = useState(initialMetadata);
  const [errors, setErrors] = useState({});

  const genres = [
    'Electronic', 'Hip Hop', 'Rock', 'Pop', 'Jazz', 'Classical', 'Country',
    'R&B', 'Reggae', 'Blues', 'Folk', 'Metal', 'Punk', 'Alternative',
    'Ambient', 'Experimental', 'Indie', 'Funk', 'Soul', 'Gospel', 'Other'
  ];

  useEffect(() => {
    // Auto-fill some metadata from file
    if (audioFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const audio = new Audio();
        audio.onloadedmetadata = () => {
          setFormData(prev => ({
            ...prev,
            duration: Math.floor(audio.duration) || 0
          }));
        };
        audio.src = e.target.result;
      };
      reader.readAsDataURL(audioFile);
    }
  }, [audioFile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTagInput = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({
      ...prev,
      tags: tags.slice(0, 10) // Limit to 10 tags
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (!formData.artist.trim()) {
      newErrors.artist = 'Artist is required';
    } else if (formData.artist.length > 100) {
      newErrors.artist = 'Artist name must be less than 100 characters';
    }

    if (!formData.genre) {
      newErrors.genre = 'Genre is required';
    }

    if (formData.description.length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    if (formData.tags.length > 20) {
      newErrors.tags = 'Maximum 20 tags allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <h3 style={{ marginBottom: '16px', color: '#333' }}>Step 2: Add Metadata</h3>
      
      <div style={{ 
        background: '#f8f9fa', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '24px' 
      }}>
        <h4 style={{ marginBottom: '8px', color: '#333' }}>Audio File Info</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '14px', color: '#666' }}>
          <div><strong>File:</strong> {audioFile?.name}</div>
          <div><strong>Size:</strong> {(audioFile?.size / 1024 / 1024).toFixed(2)} MB</div>
          <div><strong>Format:</strong> {audioFile?.type.split('/')[1].toUpperCase()}</div>
          <div><strong>Duration:</strong> {formatDuration(formData.duration)}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">
            Title <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter the title of your audio track"
            maxLength={100}
          />
          {errors.title && <div style={{ color: 'red', fontSize: '14px', marginTop: '4px' }}>{errors.title}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">
            Artist <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            name="artist"
            value={formData.artist}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter the artist name"
            maxLength={100}
          />
          {errors.artist && <div style={{ color: 'red', fontSize: '14px', marginTop: '4px' }}>{errors.artist}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">
            Genre <span style={{ color: 'red' }}>*</span>
          </label>
          <select
            name="genre"
            value={formData.genre}
            onChange={handleInputChange}
            className="form-select"
          >
            <option value="">Select a genre</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
          {errors.genre && <div style={{ color: 'red', fontSize: '14px', marginTop: '4px' }}>{errors.genre}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="form-input form-textarea"
            placeholder="Describe your audio track, inspiration, or any relevant details"
            maxLength={1000}
            rows={4}
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {formData.description.length}/1000 characters
          </div>
          {errors.description && <div style={{ color: 'red', fontSize: '14px', marginTop: '4px' }}>{errors.description}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Tags</label>
          <input
            type="text"
            value={formData.tags.join(', ')}
            onChange={handleTagInput}
            className="form-input"
            placeholder="Enter tags separated by commas (e.g., electronic, ambient, chill)"
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {formData.tags.length}/20 tags
          </div>
          {errors.tags && <div style={{ color: 'red', fontSize: '14px', marginTop: '4px' }}>{errors.tags}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Release Date</label>
          <input
            type="date"
            name="releaseDate"
            value={new Date(formData.releaseDate * 1000).toISOString().split('T')[0]}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              releaseDate: Math.floor(new Date(e.target.value).getTime() / 1000)
            }))}
            className="form-input"
          />
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '32px' }}>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Back
          </button>
          <button type="submit" className="btn">
            Continue to IPFS Upload
          </button>
        </div>
      </form>
    </div>
  );
};

export default MetadataForm;