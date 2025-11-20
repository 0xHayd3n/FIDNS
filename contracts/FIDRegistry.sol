// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FIDRegistry
 * @dev ERC721 contract for .FID domain registration
 * Each FID can mint exactly one .FID domain for 0.001 ETH
 */
contract FIDRegistry is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;
    uint256 public constant MINT_PRICE = 0.001 ether;
    
    // Mapping from FID to token ID
    mapping(uint256 => uint256) public fidToTokenId;
    
    // Mapping from token ID to FID
    mapping(uint256 => uint256) public tokenIdToFID;
    
    // Mapping from FID to wallet address that minted it
    mapping(uint256 => address) public fidToOwner;
    
    // Mapping to check if a FID has been minted
    mapping(uint256 => bool) public fidMinted;
    
    event FIDMinted(uint256 indexed fid, uint256 indexed tokenId, address indexed owner);
    event FIDTransferred(uint256 indexed fid, address indexed from, address indexed to);
    
    constructor(address initialOwner) ERC721("FID Domain", "FID") Ownable(initialOwner) {
        _nextTokenId = 1;
    }
    
    /**
     * @dev Mint a .FID domain for a specific FID
     * @param fid The Farcaster ID to mint the domain for
     * @param walletAddress The wallet address linked to this FID (must be msg.sender)
     */
    function mintFID(uint256 fid, address walletAddress) external payable nonReentrant {
        require(msg.value == MINT_PRICE, "FIDRegistry: Incorrect payment amount");
        require(!fidMinted[fid], "FIDRegistry: FID already minted");
        require(walletAddress == msg.sender, "FIDRegistry: Wallet address mismatch");
        
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        
        fidToTokenId[fid] = tokenId;
        tokenIdToFID[tokenId] = fid;
        fidToOwner[fid] = walletAddress;
        fidMinted[fid] = true;
        
        _safeMint(walletAddress, tokenId);
        
        emit FIDMinted(fid, tokenId, walletAddress);
    }
    
    /**
     * @dev Get the token ID for a given FID
     * @param fid The Farcaster ID
     * @return The token ID, or 0 if not minted
     */
    function getTokenIdByFID(uint256 fid) external view returns (uint256) {
        return fidToTokenId[fid];
    }
    
    /**
     * @dev Get the FID for a given token ID
     * @param tokenId The token ID
     * @return The FID, or 0 if invalid
     */
    function getFIDByTokenId(uint256 tokenId) external view returns (uint256) {
        return tokenIdToFID[tokenId];
    }
    
    /**
     * @dev Check if a FID has been minted
     * @param fid The Farcaster ID
     * @return True if minted, false otherwise
     */
    function isFIDMinted(uint256 fid) external view returns (bool) {
        return fidMinted[fid];
    }
    
    /**
     * @dev Get the owner address for a given FID
     * @param fid The Farcaster ID
     * @return The owner address, or address(0) if not minted
     */
    function getFIDOwner(uint256 fid) external view returns (address) {
        return fidToOwner[fid];
    }
    
    /**
     * @dev Override transfer to update fidToOwner mapping
     */
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address) {
        address previousOwner = super._update(to, tokenId, auth);
        
        if (previousOwner != address(0) && to != address(0)) {
            uint256 fid = tokenIdToFID[tokenId];
            if (fid != 0) {
                fidToOwner[fid] = to;
                emit FIDTransferred(fid, previousOwner, to);
            }
        }
        
        return previousOwner;
    }
    
    /**
     * @dev Withdraw contract balance (only owner)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // Override required by Solidity
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

