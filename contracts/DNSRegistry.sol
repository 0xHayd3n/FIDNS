// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./FIDRegistry.sol";

/**
 * @title DNSRegistry
 * @dev On-chain DNS record storage and management
 * Stores DNS records (A, AAAA, CNAME, TXT, MX, etc.) for .FID domains
 */
contract DNSRegistry is Ownable {
    FIDRegistry public fidRegistry;
    
    // Record types enum
    enum RecordType {
        A,      // 0
        AAAA,   // 1
        CNAME,  // 2
        TXT,    // 3
        MX,     // 4
        NS,     // 5
        SOA,    // 6
        SRV     // 7
    }
    
    // Mapping: tokenId => recordType => name => value
    mapping(uint256 => mapping(uint8 => mapping(string => string))) public records;
    
    // Mapping: tokenId => recordType => name[] (to track all records)
    mapping(uint256 => mapping(uint8 => string[])) public recordNames;
    
    // Mapping: tokenId => recordType => name => exists
    mapping(uint256 => mapping(uint8 => mapping(string => bool))) public recordExists;
    
    event RecordSet(uint256 indexed tokenId, uint8 recordType, string name, string value);
    event RecordDeleted(uint256 indexed tokenId, uint8 recordType, string name);
    
    constructor(address _fidRegistry) Ownable(msg.sender) {
        fidRegistry = FIDRegistry(_fidRegistry);
    }
    
    /**
     * @dev Set a DNS record for a domain
     * @param tokenId The token ID of the .FID domain
     * @param recordType The type of DNS record (0=A, 1=AAAA, 2=CNAME, etc.)
     * @param name The record name (e.g., "www", "@", "mail")
     * @param value The record value (e.g., IP address, domain name)
     */
    function setRecord(
        uint256 tokenId,
        uint8 recordType,
        string calldata name,
        string calldata value
    ) external {
        require(fidRegistry.ownerOf(tokenId) == msg.sender, "DNSRegistry: Not domain owner");
        require(recordType <= uint8(RecordType.SRV), "DNSRegistry: Invalid record type");
        require(bytes(name).length > 0, "DNSRegistry: Name cannot be empty");
        require(bytes(value).length > 0, "DNSRegistry: Value cannot be empty");
        
        // Add to recordNames if it doesn't exist
        if (!recordExists[tokenId][recordType][name]) {
            recordNames[tokenId][recordType].push(name);
            recordExists[tokenId][recordType][name] = true;
        }
        
        records[tokenId][recordType][name] = value;
        
        emit RecordSet(tokenId, recordType, name, value);
    }
    
    /**
     * @dev Get a DNS record for a domain
     * @param tokenId The token ID of the .FID domain
     * @param recordType The type of DNS record
     * @param name The record name
     * @return The record value, or empty string if not found
     */
    function getRecord(
        uint256 tokenId,
        uint8 recordType,
        string calldata name
    ) external view returns (string memory) {
        return records[tokenId][recordType][name];
    }
    
    /**
     * @dev Delete a DNS record
     * @param tokenId The token ID of the .FID domain
     * @param recordType The type of DNS record
     * @param name The record name
     */
    function deleteRecord(
        uint256 tokenId,
        uint8 recordType,
        string calldata name
    ) external {
        require(fidRegistry.ownerOf(tokenId) == msg.sender, "DNSRegistry: Not domain owner");
        require(recordExists[tokenId][recordType][name], "DNSRegistry: Record does not exist");
        
        delete records[tokenId][recordType][name];
        delete recordExists[tokenId][recordType][name];
        
        // Remove from recordNames array (find and remove)
        string[] storage names = recordNames[tokenId][recordType];
        for (uint256 i = 0; i < names.length; i++) {
            if (keccak256(bytes(names[i])) == keccak256(bytes(name))) {
                names[i] = names[names.length - 1];
                names.pop();
                break;
            }
        }
        
        emit RecordDeleted(tokenId, recordType, name);
    }
    
    /**
     * @dev Get all record names for a given tokenId and recordType
     * @param tokenId The token ID of the .FID domain
     * @param recordType The type of DNS record
     * @return Array of record names
     */
    function getRecordNames(
        uint256 tokenId,
        uint8 recordType
    ) external view returns (string[] memory) {
        return recordNames[tokenId][recordType];
    }
    
    /**
     * @dev Check if a record exists
     * @param tokenId The token ID of the .FID domain
     * @param recordType The type of DNS record
     * @param name The record name
     * @return True if record exists, false otherwise
     */
    function recordExistsFor(
        uint256 tokenId,
        uint8 recordType,
        string calldata name
    ) external view returns (bool) {
        return recordExists[tokenId][recordType][name];
    }
    
    /**
     * @dev Update the FIDRegistry address (only owner)
     */
    function setFIDRegistry(address _fidRegistry) external onlyOwner {
        fidRegistry = FIDRegistry(_fidRegistry);
    }
}

