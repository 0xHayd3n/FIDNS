// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TLDRegistry.sol";

/**
 * @title DomainFractionalization
 * @dev Manages fractionalization of domains as ERC20 tokens
 * Each domain can be fractionalized into 10 billion tokens
 * Domain owner gets 50% (locked), public gets 50% (purchasable)
 */
contract DomainFractionalization is Ownable, ReentrancyGuard {
    TLDRegistry public tldRegistry;
    
    // Fixed supply per domain: 10 billion tokens
    uint256 public constant TOTAL_SUPPLY = 10_000_000_000 * 10**18; // 10 billion with 18 decimals
    uint256 public constant OWNER_SHARE = 5_000_000_000 * 10**18; // 50% = 5 billion
    uint256 public constant PUBLIC_SHARE = 5_000_000_000 * 10**18; // 50% = 5 billion
    
    // Maximum number of token holders per domain to prevent DoS
    uint256 public constant MAX_TOKEN_HOLDERS = 1000;
    
    // Mapping: domain => token contract address
    mapping(string => address) public domainTokens;
    
    // Mapping: domain => fractionalization info
    mapping(string => FractionalizationInfo) public fractionalizationInfo;
    
    // Mapping: domain => array of token holder addresses (for majority detection)
    mapping(string => address[]) public tokenHolders;
    
    // Mapping: domain => holder => balance (for quick lookup)
    mapping(string => mapping(address => uint256)) public holderBalances;
    
    // Configurable grace period (default 1 day)
    uint256 public gracePeriod = 1 days;
    
    struct FractionalizationInfo {
        address tokenContract;
        address domainOwner;
        uint256 unlockTimestamp; // When owner tokens unlock (domain expiration)
        bool isEnabled;
        uint256 publicTokenPrice; // Price per token in wei
    }
    
    event FractionalizationEnabled(string indexed domain, address indexed tokenContract, address indexed owner);
    event PublicTokensPurchased(string indexed domain, address indexed buyer, uint256 amount, uint256 totalPaid);
    event OwnerTokensUnlocked(string indexed domain, address indexed owner);
    event DomainTransferred(string indexed domain, address indexed oldOwner, address indexed newOwner);
    event OwnerTokensBurned(string indexed domain, address indexed owner, uint256 amount);
    
    constructor(address _tldRegistry, address initialOwner) Ownable(initialOwner) {
        tldRegistry = TLDRegistry(_tldRegistry);
    }
    
    /**
     * @dev Set the grace period for domain expiration
     * @param _gracePeriod The grace period in seconds (max 30 days)
     */
    function setGracePeriod(uint256 _gracePeriod) external onlyOwner {
        require(_gracePeriod <= 30 days, "DomainFractionalization: Grace period too long");
        gracePeriod = _gracePeriod;
    }
    
    /**
     * @dev Enable fractionalization for a domain
     * @param domain The full domain name (e.g., "hayden.com")
     * @param publicTokenPrice Price per public token in wei
     */
    function enableFractionalization(
        string calldata domain,
        uint256 publicTokenPrice
    ) external {
        // Verify caller owns the domain
        (address domainOwner, , uint256 expirationTimestamp, , ) = tldRegistry.domainInfo(domain);
        require(domainOwner == msg.sender, "DomainFractionalization: Not domain owner");
        require(!fractionalizationInfo[domain].isEnabled, "DomainFractionalization: Already fractionalized");
        require(publicTokenPrice > 0, "DomainFractionalization: Invalid token price");
        require(expirationTimestamp > block.timestamp, "DomainFractionalization: Domain expired");
        
        // Deploy ERC20 token contract for this domain
        DomainToken token = new DomainToken(domain, msg.sender);
        address tokenAddress = address(token);
        
        // Mint owner's locked tokens (50%)
        token.mintLocked(msg.sender, OWNER_SHARE, expirationTimestamp);
        
        // Store fractionalization info
        fractionalizationInfo[domain] = FractionalizationInfo({
            tokenContract: tokenAddress,
            domainOwner: msg.sender,
            unlockTimestamp: expirationTimestamp,
            isEnabled: true,
            publicTokenPrice: publicTokenPrice
        });
        
        domainTokens[domain] = tokenAddress;
        
        emit FractionalizationEnabled(domain, tokenAddress, msg.sender);
    }
    
    /**
     * @dev Purchase public tokens for a domain
     * @param domain The full domain name
     * @param numTokens Number of tokens to purchase
     */
    function purchasePublicTokens(
        string calldata domain,
        uint256 numTokens
    ) external payable nonReentrant {
        FractionalizationInfo memory info = fractionalizationInfo[domain];
        require(info.isEnabled, "DomainFractionalization: Not fractionalized");
        require(numTokens > 0, "DomainFractionalization: Invalid amount");
        
        DomainToken token = DomainToken(info.tokenContract);
        
        // Check available public supply
        uint256 availableSupply = token.publicSupply();
        require(numTokens <= availableSupply, "DomainFractionalization: Insufficient public supply");
        
        // Calculate total price: price per token * number of tokens
        // publicTokenPrice is in wei for 1 full token (1 * 10^18 tokens in smallest unit)
        // numTokens is the number of tokens in smallest unit (with 18 decimals)
        // Formula: (price per full token * numTokens) / 10^18 = total price in wei
        // Use rounding up to prevent precision loss that could favor the buyer
        uint256 totalPrice = (info.publicTokenPrice * numTokens + 10**18 - 1) / 10**18;
        require(msg.value >= totalPrice, "DomainFractionalization: Insufficient payment");
        
        // Mint tokens to buyer
        token.mintPublic(msg.sender, numTokens);
        
        // Track token holder (only if not already tracked)
        if (holderBalances[domain][msg.sender] == 0 && msg.sender != info.domainOwner) {
            require(tokenHolders[domain].length < MAX_TOKEN_HOLDERS, "DomainFractionalization: Too many token holders");
            tokenHolders[domain].push(msg.sender);
        }
        holderBalances[domain][msg.sender] += numTokens;
        
        // Refund excess payment
        if (msg.value > totalPrice) {
            uint256 excess = msg.value - totalPrice;
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "DomainFractionalization: Refund transfer failed");
        }
        
        emit PublicTokensPurchased(domain, msg.sender, numTokens, totalPrice);
    }
    
    /**
     * @dev Unlock owner tokens after domain renewal
     * @param domain The full domain name
     */
    function unlockOwnerTokens(string calldata domain) external {
        FractionalizationInfo memory info = fractionalizationInfo[domain];
        require(info.isEnabled, "DomainFractionalization: Not fractionalized");
        
        DomainToken token = DomainToken(info.tokenContract);
        
        // Check if domain was renewed (expiration extended)
        (, , uint256 newExpirationTimestamp, , ) = tldRegistry.domainInfo(domain);
        require(newExpirationTimestamp > info.unlockTimestamp, "DomainFractionalization: Domain not renewed");
        
        // Unlock owner tokens
        token.unlockOwnerTokens(info.domainOwner);
        
        // Update unlock timestamp
        fractionalizationInfo[domain].unlockTimestamp = newExpirationTimestamp;
        
        emit OwnerTokensUnlocked(domain, info.domainOwner);
    }
    
    /**
     * @dev Handle renewal failure: burn owner tokens and transfer domain
     * @param domain The full domain name
     * @notice Can be called by anyone once domain is expired, but only if conditions are met
     */
    function burnAndTransfer(string calldata domain) external nonReentrant {
        FractionalizationInfo memory info = fractionalizationInfo[domain];
        require(info.isEnabled, "DomainFractionalization: Not fractionalized");
        
        // Check domain is expired
        (, , uint256 expirationTimestamp, , ) = tldRegistry.domainInfo(domain);
        require(block.timestamp >= expirationTimestamp, "DomainFractionalization: Domain not expired");
        
        // Additional safety: require domain to be expired for at least grace period (prevents immediate griefing)
        require(block.timestamp >= expirationTimestamp + gracePeriod, "DomainFractionalization: Grace period active");
        
        DomainToken token = DomainToken(info.tokenContract);
        
        // Find majority owner (>50% of tokens)
        address majorityOwner = getMajorityOwner(domain);
        require(majorityOwner != address(0), "DomainFractionalization: No majority owner");
        require(majorityOwner != info.domainOwner, "DomainFractionalization: Owner still majority");
        
        // Burn owner's locked tokens
        uint256 ownerBalance = token.balanceOf(info.domainOwner);
        if (ownerBalance > 0) {
            token.burn(info.domainOwner, ownerBalance);
            // Update holder tracking
            holderBalances[domain][info.domainOwner] = 0;
            emit OwnerTokensBurned(domain, info.domainOwner, ownerBalance);
        }
        
        // Actually transfer domain ownership to majority token holder
        tldRegistry.transferDomainOwnership(domain, majorityOwner);
        
        // Update fractionalization info
        fractionalizationInfo[domain].domainOwner = majorityOwner;
        
        emit DomainTransferred(domain, info.domainOwner, majorityOwner);
    }
    
    /**
     * @dev Called by DomainToken when tokens are transferred to track holders
     * @param domain The domain name
     * @param from The sender address
     * @param to The recipient address
     * @param amount The amount transferred
     */
    function onTokenTransfer(string memory domain, address from, address to, uint256 amount) external {
        // Only called by DomainToken contracts - verify domain-token contract relationship
        address expectedToken = domainTokens[domain];
        require(expectedToken != address(0), "DomainFractionalization: Domain not fractionalized");
        require(msg.sender == expectedToken, "DomainFractionalization: Invalid token contract");
        require(fractionalizationInfo[domain].isEnabled, "DomainFractionalization: Fractionalization not enabled");
        
        // Update holder balances
        if (from != address(0)) {
            require(holderBalances[domain][from] >= amount, "DomainFractionalization: Insufficient balance");
            holderBalances[domain][from] -= amount;
            
            // If balance becomes 0 and not domain owner, remove from holders list
            if (holderBalances[domain][from] == 0 && from != fractionalizationInfo[domain].domainOwner) {
                // Remove from tokenHolders array
                address[] storage holders = tokenHolders[domain];
                for (uint256 i = 0; i < holders.length; i++) {
                    if (holders[i] == from) {
                        holders[i] = holders[holders.length - 1];
                        holders.pop();
                        break;
                    }
                }
            }
        }
        
        if (to != address(0)) {
            // Only add to holders list if not already tracked and not the domain owner
            if (holderBalances[domain][to] == 0 && to != fractionalizationInfo[domain].domainOwner) {
                tokenHolders[domain].push(to);
            }
            holderBalances[domain][to] += amount;
        } else {
            // Handle burn: to == address(0)
            // Balance already decremented above, no additional action needed
        }
    }
    
    /**
     * @dev Get the majority token holder (>50% of supply)
     * @param domain The full domain name
     * @return The address of the majority holder, or address(0) if none
     */
    function getMajorityOwner(string calldata domain) public view returns (address) {
        FractionalizationInfo memory info = fractionalizationInfo[domain];
        if (!info.isEnabled) {
            return address(0);
        }
        
        DomainToken token = DomainToken(info.tokenContract);
        uint256 totalSupply = token.totalSupply();
        if (totalSupply == 0) {
            return address(0);
        }
        
        uint256 majorityThreshold = totalSupply / 2 + 1; // >50%
        
        // Check current owner first
        uint256 ownerBalance = token.balanceOf(info.domainOwner);
        if (ownerBalance >= majorityThreshold) {
            return info.domainOwner;
        }
        
        // Iterate through tracked token holders to find majority
        // Limit iterations to prevent gas DoS attacks
        address[] memory holders = tokenHolders[domain];
        uint256 maxIterations = holders.length > 100 ? 100 : holders.length;
        
        for (uint256 i = 0; i < maxIterations; i++) {
            // Safety check: ensure we have enough gas remaining
            if (gasleft() < 50000) {
                break; // Not enough gas to continue safely
            }
            
            address holder = holders[i];
            // Skip the domain owner (already checked)
            if (holder == info.domainOwner) {
                continue;
            }
            
            uint256 balance = token.balanceOf(holder);
            if (balance >= majorityThreshold) {
                return holder;
            }
        }
        
        // No majority holder found (or iteration limit reached)
        return address(0);
    }
}

/**
 * @title DomainToken
 * @dev ERC20 token for a specific domain
 */
contract DomainToken is ERC20 {
    address public domainFractionalization;
    address public owner;
    uint256 public lockedSupply;
    uint256 public unlockTimestamp;
    bool public ownerTokensUnlocked;
    string public domainName;
    
    modifier onlyFractionalization() {
        require(msg.sender == domainFractionalization, "DomainToken: Only fractionalization contract");
        _;
    }
    
    constructor(string memory _domainName, address _owner) ERC20(string(abi.encodePacked(_domainName, " Token")), string(abi.encodePacked(_domainName, "TKN"))) {
        domainFractionalization = msg.sender;
        owner = _owner;
        domainName = _domainName;
    }
    
    /**
     * @dev Mint locked tokens for domain owner
     */
    function mintLocked(address to, uint256 amount, uint256 _unlockTimestamp) external onlyFractionalization {
        _mint(to, amount);
        lockedSupply = amount;
        unlockTimestamp = _unlockTimestamp;
    }
    
    /**
     * @dev Mint public tokens
     */
    function mintPublic(address to, uint256 amount) external onlyFractionalization {
        _mint(to, amount);
    }
    
    /**
     * @dev Unlock owner tokens
     */
    function unlockOwnerTokens(address _owner) external onlyFractionalization {
        require(_owner == owner, "DomainToken: Not domain owner");
        require(block.timestamp >= unlockTimestamp || ownerTokensUnlocked, "DomainToken: Tokens still locked");
        ownerTokensUnlocked = true;
        lockedSupply = 0;
    }
    
    /**
     * @dev Burn tokens
     */
    function burn(address from, uint256 amount) external onlyFractionalization {
        _burn(from, amount);
    }
    
    /**
     * @dev Get available public supply
     * Public supply = total supply - owner's locked tokens
     * If owner tokens are unlocked, they can be transferred, so they're not part of public supply
     */
    function publicSupply() external view returns (uint256) {
        uint256 total = totalSupply();
        uint256 ownerBalance = balanceOf(owner);
        uint256 locked = ownerTokensUnlocked ? 0 : lockedSupply;
        
        // If owner tokens are still locked, public supply = total - locked
        // If owner tokens are unlocked, public supply = total - ownerBalance (owner can transfer)
        if (ownerTokensUnlocked) {
            return total - ownerBalance;
        } else {
            return total - locked;
        }
    }
    
    /**
     * @dev Override transfer to check if owner tokens are locked and track holders
     */
    function _update(address from, address to, uint256 value) internal override {
        if (from == owner && !ownerTokensUnlocked && block.timestamp < unlockTimestamp) {
            uint256 locked = lockedSupply;
            uint256 fromBalance = balanceOf(from);
            require(fromBalance - value >= locked, "DomainToken: Cannot transfer locked tokens");
        }
        
        // Notify fractionalization contract of transfer for holder tracking
        if (domainFractionalization != address(0)) {
            DomainFractionalization(domainFractionalization).onTokenTransfer(domainName, from, to, value);
        }
        
        super._update(from, to, value);
    }
}

