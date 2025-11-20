// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FIDRegistry.sol";
import "./DNSRegistry.sol";

/**
 * @title FIDResolver
 * @dev Resolves FID or username to domain and DNS records
 * Handles both numeric FID (1355634.FID) and username (0xhayd3n.fid) resolution
 */
contract FIDResolver {
    FIDRegistry public fidRegistry;
    DNSRegistry public dnsRegistry;
    
    // Mapping from username (lowercase) to FID
    mapping(string => uint256) public usernameToFID;
    
    // Mapping from FID to username
    mapping(uint256 => string) public fidToUsername;
    
    event UsernameRegistered(uint256 indexed fid, string username);
    event UsernameUpdated(uint256 indexed fid, string oldUsername, string newUsername);
    
    constructor(address _fidRegistry, address _dnsRegistry) {
        fidRegistry = FIDRegistry(_fidRegistry);
        dnsRegistry = DNSRegistry(_dnsRegistry);
    }
    
    /**
     * @dev Register or update a username for a FID
     * @param fid The Farcaster ID
     * @param username The username (without .fid extension)
     */
    function registerUsername(uint256 fid, string calldata username) external {
        require(fidRegistry.isFIDMinted(fid), "FIDResolver: FID not minted");
        require(fidRegistry.getFIDOwner(fid) == msg.sender, "FIDResolver: Not FID owner");
        require(bytes(username).length > 0, "FIDResolver: Username cannot be empty");
        
        string memory lowerUsername = _toLower(username);
        
        // If username already exists for another FID, revert
        uint256 existingFID = usernameToFID[lowerUsername];
        require(existingFID == 0 || existingFID == fid, "FIDResolver: Username already taken");
        
        // If FID already has a username, remove old mapping
        string memory oldUsername = fidToUsername[fid];
        if (bytes(oldUsername).length > 0) {
            delete usernameToFID[_toLower(oldUsername)];
            emit UsernameUpdated(fid, oldUsername, username);
        } else {
            emit UsernameRegistered(fid, username);
        }
        
        usernameToFID[lowerUsername] = fid;
        fidToUsername[fid] = username;
    }
    
    /**
     * @dev Resolve a FID to token ID
     * @param fid The Farcaster ID
     * @return tokenId The token ID, or 0 if not minted
     */
    function resolveFID(uint256 fid) external view returns (uint256) {
        return fidRegistry.getTokenIdByFID(fid);
    }
    
    /**
     * @dev Resolve a username to token ID
     * @param username The username (with or without .fid extension)
     * @return tokenId The token ID, or 0 if not found
     */
    function resolveUsername(string calldata username) external view returns (uint256) {
        string memory cleanUsername = _removeExtension(username);
        string memory lowerUsername = _toLower(cleanUsername);
        uint256 fid = usernameToFID[lowerUsername];
        
        if (fid == 0) {
            return 0;
        }
        
        return fidRegistry.getTokenIdByFID(fid);
    }
    
    /**
     * @dev Get DNS record for a FID
     * @param fid The Farcaster ID
     * @param recordType The type of DNS record
     * @param name The record name
     * @return The record value, or empty string if not found
     */
    function getDNSRecordByFID(
        uint256 fid,
        uint8 recordType,
        string calldata name
    ) external view returns (string memory) {
        uint256 tokenId = fidRegistry.getTokenIdByFID(fid);
        if (tokenId == 0) {
            return "";
        }
        return dnsRegistry.getRecord(tokenId, recordType, name);
    }
    
    /**
     * @dev Get DNS record for a username
     * @param username The username
     * @param recordType The type of DNS record
     * @param name The record name
     * @return The record value, or empty string if not found
     */
    function getDNSRecordByUsername(
        string calldata username,
        uint8 recordType,
        string calldata name
    ) external view returns (string memory) {
        uint256 tokenId = this.resolveUsername(username);
        if (tokenId == 0) {
            return "";
        }
        return dnsRegistry.getRecord(tokenId, recordType, name);
    }
    
    /**
     * @dev Get username for a FID
     * @param fid The Farcaster ID
     * @return The username, or empty string if not registered
     */
    function getUsername(uint256 fid) external view returns (string memory) {
        return fidToUsername[fid];
    }
    
    /**
     * @dev Get FID for a username
     * @param username The username
     * @return The FID, or 0 if not found
     */
    function getFIDByUsername(string calldata username) external view returns (uint256) {
        string memory cleanUsername = _removeExtension(username);
        string memory lowerUsername = _toLower(cleanUsername);
        return usernameToFID[lowerUsername];
    }
    
    /**
     * @dev Internal function to convert string to lowercase
     */
    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint256 i = 0; i < bStr.length; i++) {
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }
    
    /**
     * @dev Internal function to remove .fid extension from username
     */
    function _removeExtension(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bResult = new bytes(bStr.length);
        uint256 resultLength = 0;
        
        // Check if ends with .fid (case insensitive)
        if (bStr.length >= 4) {
            bytes memory suffix = new bytes(4);
            for (uint256 i = 0; i < 4; i++) {
                uint8 char = uint8(bStr[bStr.length - 4 + i]);
                if (char >= 65 && char <= 90) {
                    char += 32; // Convert to lowercase
                }
                suffix[i] = bytes1(char);
            }
            
            if (keccak256(suffix) == keccak256(bytes(".fid"))) {
                resultLength = bStr.length - 4;
                for (uint256 i = 0; i < resultLength; i++) {
                    bResult[i] = bStr[i];
                }
            } else {
                resultLength = bStr.length;
                for (uint256 i = 0; i < resultLength; i++) {
                    bResult[i] = bStr[i];
                }
            }
        } else {
            resultLength = bStr.length;
            for (uint256 i = 0; i < resultLength; i++) {
                bResult[i] = bStr[i];
            }
        }
        
        bytes memory finalResult = new bytes(resultLength);
        for (uint256 i = 0; i < resultLength; i++) {
            finalResult[i] = bResult[i];
        }
        return string(finalResult);
    }
}

