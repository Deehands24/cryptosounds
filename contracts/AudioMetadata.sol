// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AudioMetadata
 * @dev Contract for managing audio metadata and validation
 * @author Crypto Sounds Team
 */
contract AudioMetadata is Ownable, ReentrancyGuard {
    
    // Supported audio formats
    enum AudioFormat {
        WAV,
        MP3,
        FLAC,
        AAC,
        OGG,
        M4A
    }

    // Audio quality levels
    enum QualityLevel {
        LOW,        // 128kbps
        MEDIUM,     // 256kbps
        HIGH,       // 320kbps
        LOSSLESS    // Lossless compression
    }

    // Detailed audio metadata structure
    struct DetailedAudioMetadata {
        string title;
        string artist;
        string album;
        string genre;
        uint256 duration; // Duration in seconds
        AudioFormat audioFormat;
        QualityLevel quality;
        uint256 bitrate; // Bitrate in kbps
        uint256 sampleRate; // Sample rate in Hz
        uint256 channels; // Number of audio channels (1=mono, 2=stereo)
        uint256 fileSize; // File size in bytes
        string description;
        string lyrics;
        uint256 releaseDate;
        string recordLabel;
        string[] tags; // Array of tags for categorization
        bool explicit; // Explicit content flag
        string coverArtURI; // IPFS URI for cover art
    }

    // Mapping from hash to validated metadata
    mapping(bytes32 => DetailedAudioMetadata) public validatedMetadata;
    
    // Mapping from token ID to metadata hash
    mapping(uint256 => bytes32) public tokenMetadataHash;
    
    // Events
    event MetadataValidated(bytes32 indexed metadataHash, string title, string artist);
    event MetadataUpdated(uint256 indexed tokenId, bytes32 indexed oldHash, bytes32 indexed newHash);

    // Valid audio formats
    mapping(AudioFormat => bool) public supportedFormats;
    
    // Minimum and maximum constraints
    uint256 public constant MIN_DURATION = 1; // 1 second
    uint256 public constant MAX_DURATION = 36000; // 10 hours
    uint256 public constant MIN_FILE_SIZE = 1000; // 1KB
    uint256 public constant MAX_FILE_SIZE = 1000000000; // 1GB
    uint256 public constant MAX_TAGS = 20; // Maximum number of tags

    constructor() {
        // Enable all supported formats by default
        supportedFormats[AudioFormat.WAV] = true;
        supportedFormats[AudioFormat.MP3] = true;
        supportedFormats[AudioFormat.FLAC] = true;
        supportedFormats[AudioFormat.AAC] = true;
        supportedFormats[AudioFormat.OGG] = true;
        supportedFormats[AudioFormat.M4A] = true;
    }

    /**
     * @dev Validate and store audio metadata
     * @param metadata Audio metadata to validate
     * @return metadataHash Hash of the validated metadata
     */
    function validateAndStoreMetadata(
        DetailedAudioMetadata memory metadata
    ) public onlyOwner returns (bytes32) {
        // Validate basic fields
        require(bytes(metadata.title).length > 0, "Title cannot be empty");
        require(bytes(metadata.title).length <= 100, "Title too long");
        require(bytes(metadata.artist).length > 0, "Artist cannot be empty");
        require(bytes(metadata.artist).length <= 100, "Artist name too long");
        require(bytes(metadata.album).length <= 100, "Album name too long");
        require(bytes(metadata.genre).length <= 50, "Genre too long");
        require(bytes(metadata.description).length <= 1000, "Description too long");
        require(metadata.tags.length <= MAX_TAGS, "Too many tags");

        // Validate duration
        require(metadata.duration >= MIN_DURATION && metadata.duration <= MAX_DURATION, "Invalid duration");

        // Validate file size
        require(metadata.fileSize >= MIN_FILE_SIZE && metadata.fileSize <= MAX_FILE_SIZE, "Invalid file size");

        // Validate audio format
        require(supportedFormats[metadata.audioFormat], "Unsupported audio format");

        // Validate bitrate based on format and quality
        require(_validateBitrate(metadata.audioFormat, metadata.quality, metadata.bitrate), "Invalid bitrate for format/quality");

        // Validate sample rate
        require(metadata.sampleRate >= 8000 && metadata.sampleRate <= 192000, "Invalid sample rate");

        // Validate channels
        require(metadata.channels >= 1 && metadata.channels <= 8, "Invalid number of channels");

        // Generate metadata hash
        bytes32 metadataHash = keccak256(abi.encodePacked(
            metadata.title,
            metadata.artist,
            metadata.album,
            metadata.duration,
            uint256(metadata.audioFormat),
            uint256(metadata.quality),
            metadata.bitrate,
            metadata.sampleRate,
            metadata.channels
        ));

        // Store validated metadata
        validatedMetadata[metadataHash] = metadata;

        emit MetadataValidated(metadataHash, metadata.title, metadata.artist);

        return metadataHash;
    }

    /**
     * @dev Link metadata hash to token ID
     * @param tokenId Token ID
     * @param metadataHash Metadata hash
     */
    function linkMetadataToToken(uint256 tokenId, bytes32 metadataHash) public onlyOwner {
        require(validatedMetadata[metadataHash].duration > 0, "Metadata not validated");
        tokenMetadataHash[tokenId] = metadataHash;
    }

    /**
     * @dev Get metadata for a token
     * @param tokenId Token ID
     * @return DetailedAudioMetadata struct
     */
    function getTokenMetadata(uint256 tokenId) public view returns (DetailedAudioMetadata memory) {
        bytes32 hash = tokenMetadataHash[tokenId];
        require(hash != bytes32(0), "No metadata linked to token");
        return validatedMetadata[hash];
    }

    /**
     * @dev Update metadata for a token (only if not yet minted)
     * @param tokenId Token ID
     * @param newMetadata New metadata
     */
    function updateTokenMetadata(
        uint256 tokenId,
        DetailedAudioMetadata memory newMetadata
    ) public onlyOwner returns (bytes32) {
        bytes32 oldHash = tokenMetadataHash[tokenId];
        require(oldHash != bytes32(0), "Token metadata not found");

        bytes32 newHash = validateAndStoreMetadata(newMetadata);
        tokenMetadataHash[tokenId] = newHash;

        emit MetadataUpdated(tokenId, oldHash, newHash);

        return newHash;
    }

    /**
     * @dev Toggle support for audio format
     * @param format Audio format
     * @param supported Whether format is supported
     */
    function setFormatSupport(AudioFormat format, bool supported) public onlyOwner {
        supportedFormats[format] = supported;
    }

    /**
     * @dev Validate bitrate for given format and quality
     * @param format Audio format
     * @param quality Quality level
     * @param bitrate Bitrate to validate
     * @return bool Whether bitrate is valid
     */
    function _validateBitrate(
        AudioFormat format,
        QualityLevel quality,
        uint256 bitrate
    ) internal pure returns (bool) {
        if (format == AudioFormat.WAV || format == AudioFormat.FLAC) {
            // Lossless formats - bitrate should be high
            return bitrate >= 1000;
        } else if (format == AudioFormat.MP3) {
            if (quality == QualityLevel.LOW) return bitrate >= 96 && bitrate <= 160;
            if (quality == QualityLevel.MEDIUM) return bitrate >= 192 && bitrate <= 256;
            if (quality == QualityLevel.HIGH) return bitrate >= 320 && bitrate <= 320;
            return false;
        } else if (format == AudioFormat.AAC) {
            if (quality == QualityLevel.LOW) return bitrate >= 96 && bitrate <= 128;
            if (quality == QualityLevel.MEDIUM) return bitrate >= 192 && bitrate <= 256;
            if (quality == QualityLevel.HIGH) return bitrate >= 256 && bitrate <= 320;
            return false;
        }
        return true; // For other formats, allow any reasonable bitrate
    }

    /**
     * @dev Convert audio format enum to string
     * @param format Audio format enum
     * @return string format name
     */
    function formatToString(AudioFormat format) public pure returns (string memory) {
        if (format == AudioFormat.WAV) return "WAV";
        if (format == AudioFormat.MP3) return "MP3";
        if (format == AudioFormat.FLAC) return "FLAC";
        if (format == AudioFormat.AAC) return "AAC";
        if (format == AudioFormat.OGG) return "OGG";
        if (format == AudioFormat.M4A) return "M4A";
        return "UNKNOWN";
    }

    /**
     * @dev Convert quality level enum to string
     * @param quality Quality level enum
     * @return string quality description
     */
    function qualityToString(QualityLevel quality) public pure returns (string memory) {
        if (quality == QualityLevel.LOW) return "Low (128kbps)";
        if (quality == QualityLevel.MEDIUM) return "Medium (256kbps)";
        if (quality == QualityLevel.HIGH) return "High (320kbps)";
        if (quality == QualityLevel.LOSSLESS) return "Lossless";
        return "Unknown";
    }
}