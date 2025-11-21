// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TLDRegistry.sol";

/**
 * @title ITLDRegistry
 * @dev Interface for TLDRegistry to enable type-safe calls
 */
interface ITLDRegistry {
    function renewDomainFromTreasury(
        string calldata domain,
        string calldata tld,
        uint256 numYears
    ) external;
}

/**
 * @title DomainTreasury
 * @dev Manages treasury for each domain, collects fees, and handles auto-renewal
 */
contract DomainTreasury is Ownable, ReentrancyGuard {
    TLDRegistry public tldRegistry;
    
    // Mapping: domain => treasury balance
    mapping(string => uint256) public treasuryBalances;
    
    // Mapping: domain => fee percentage (in basis points, e.g., 100 = 1%)
    mapping(string => uint256) public domainFeePercentages;
    
    // Global default fee percentage (basis points)
    uint256 public defaultFeePercentage = 100; // 1% default
    
    // Events
    event FeeDeposited(string indexed domain, address indexed payer, uint256 amount);
    event DomainAutoRenewed(string indexed domain, uint256 indexed numYears, uint256 cost);
    event ExcessWithdrawn(string indexed domain, address indexed owner, uint256 amount);
    event FeePercentageSet(string indexed domain, uint256 percentage);
    
    constructor(address _tldRegistry, address initialOwner) Ownable(initialOwner) {
        tldRegistry = TLDRegistry(_tldRegistry);
    }
    
    /**
     * @dev Modifier to restrict functions to only TLDRegistry contract
     */
    modifier onlyTLDRegistry() {
        require(msg.sender == address(tldRegistry), "DomainTreasury: Only TLDRegistry can call");
        _;
    }
    
    /**
     * @dev Set fee percentage for a domain (in basis points)
     * @param domain The full domain name
     * @param percentage Fee percentage in basis points (100 = 1%)
     */
    function setDomainFeePercentage(string calldata domain, uint256 percentage) external {
        (address domainOwner, , uint256 expirationTimestamp, , ) = tldRegistry.domainInfo(domain);
        require(domainOwner != address(0), "DomainTreasury: Domain not found");
        require(domainOwner == msg.sender, "DomainTreasury: Not domain owner");
        require(block.timestamp < expirationTimestamp, "DomainTreasury: Domain expired");
        require(percentage <= 1000, "DomainTreasury: Fee too high (max 10%)");
        
        domainFeePercentages[domain] = percentage;
        emit FeePercentageSet(domain, percentage);
    }
    
    /**
     * @dev Deposit fee for a domain
     * @param domain The full domain name
     * @notice Only callable by TLDRegistry contract to prevent unauthorized deposits
     */
    function depositFee(string calldata domain) external payable onlyTLDRegistry {
        require(msg.value > 0, "DomainTreasury: No fee provided");
        require(bytes(domain).length > 0, "DomainTreasury: Domain cannot be empty");
        treasuryBalances[domain] += msg.value;
        emit FeeDeposited(domain, msg.sender, msg.value);
    }
    
    /**
     * @dev Calculate fee for a transaction
     * @param domain The full domain name
     * @param transactionValue The value of the transaction
     * @return The fee amount
     */
    function calculateFee(string calldata domain, uint256 transactionValue) public view returns (uint256) {
        uint256 feePercentage = domainFeePercentages[domain];
        if (feePercentage == 0) {
            feePercentage = defaultFeePercentage;
        }
        return (transactionValue * feePercentage) / 10000;
    }
    
    /**
     * @dev Auto-renew domain using treasury funds
     * @param domain The domain name without TLD
     * @param tld The TLD
     * @param numYears Number of years to renew
     */
    function autoRenewDomain(
        string calldata domain,
        string calldata tld,
        uint256 numYears
    ) external nonReentrant {
        string memory fullDomain = string(abi.encodePacked(domain, ".", tld));
        
        // Verify domain exists and is owned
        (address domainOwner, , , , ) = tldRegistry.domainInfo(fullDomain);
        require(domainOwner != address(0), "DomainTreasury: Domain not found");
        require(domainOwner == msg.sender, "DomainTreasury: Not domain owner");
        require(numYears > 0 && numYears <= 10, "DomainTreasury: Invalid years");
        
        // Calculate renewal cost and validate TLD price is set
        uint256 renewalCost = tldRegistry.getDomainPrice(tld, numYears);
        require(renewalCost > 0, "DomainTreasury: TLD price not set");
        require(treasuryBalances[fullDomain] >= renewalCost, "DomainTreasury: Insufficient treasury balance");
        
        // Deduct from treasury
        treasuryBalances[fullDomain] -= renewalCost;
        
        // Call TLDRegistry to renew using treasury funds
        // Use interface for type-safe call with proper error propagation
        try ITLDRegistry(address(tldRegistry)).renewDomainFromTreasury{value: renewalCost}(
            domain,
            tld,
            numYears
        ) {
            // Success - domain renewed
        } catch {
            // Revert the treasury balance deduction on failure
            treasuryBalances[fullDomain] += renewalCost;
            revert("DomainTreasury: Renewal failed");
        }
        
        emit DomainAutoRenewed(fullDomain, numYears, renewalCost);
    }
    
    /**
     * @dev Withdraw excess funds from treasury (domain owner only)
     * @param domain The full domain name
     * @param amount Amount to withdraw
     */
    function withdrawExcess(string calldata domain, uint256 amount) external nonReentrant {
        (address domainOwner, , , , ) = tldRegistry.domainInfo(domain);
        require(domainOwner != address(0), "DomainTreasury: Domain not found");
        require(domainOwner == msg.sender, "DomainTreasury: Not domain owner");
        require(amount > 0, "DomainTreasury: Amount must be greater than zero");
        require(treasuryBalances[domain] >= amount, "DomainTreasury: Insufficient balance");
        
        treasuryBalances[domain] -= amount;
        
        // Use call() instead of transfer() for safer withdrawals
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "DomainTreasury: Transfer failed");
        
        emit ExcessWithdrawn(domain, msg.sender, amount);
    }
    
    /**
     * @dev Get treasury balance for a domain
     * @param domain The full domain name
     * @return The treasury balance
     */
    function getTreasuryBalance(string calldata domain) external view returns (uint256) {
        return treasuryBalances[domain];
    }
    
    /**
     * @dev Check if treasury has enough funds to renew domain
     * @param domain The domain name without TLD
     * @param tld The TLD
     * @param numYears Number of years
     * @return True if sufficient funds
     */
    function canAutoRenew(
        string calldata domain,
        string calldata tld,
        uint256 numYears
    ) external view returns (bool) {
        string memory fullDomain = string(abi.encodePacked(domain, ".", tld));
        uint256 renewalCost = tldRegistry.getDomainPrice(tld, numYears);
        return treasuryBalances[fullDomain] >= renewalCost;
    }
}

