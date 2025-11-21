// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title TLDRegistry
 * @dev On-chain domain name registration with TLDs (.com, .net, etc.)
 * Users can register domain names with traditional TLDs for a fee based on years
 */
contract TLDRegistry is Ownable, ReentrancyGuard {
    // Custom errors for gas savings
    error InvalidUSDCAddress();
    error InvalidTreasuryAddress();
    error InvalidFractionalizationAddress();
    error InvalidPriceFeedAddress();
    error PriceFeedNotSet();
    error InvalidPriceFromOracle();
    error PriceFeedStale();
    error PriceFeedTooStale();
    error InvalidYears();
    error TLDPriceNotSet();
    error DomainNotAvailable();
    error InsufficientPayment();
    error FeeCalculationFailed();
    error FeeExceedsPayment();
    error FeeDepositFailed();
    error InsufficientPaymentAfterFee();
    error USDCTransferFailed();
    error NotDomainOwner();
    error DomainHasExpired();
    error InvalidDomainFormat();
    error InvalidTLDFormat();
    error InvalidNewOwner();
    error CannotTransferToSelf();
    error DomainNotFound();
    error TreasuryNotSet();
    error OnlyTreasuryCanRenew();
    
    // Domain information struct
    // Optimized for storage packing: address (20 bytes) + uint64 (8 bytes) + uint64 (8 bytes) + uint8 (1 byte) = 37 bytes
    // This fits in 2 storage slots instead of 5, saving gas
    struct DomainInfo {
        address owner;                    // 20 bytes - slot 1
        uint64 registrationTimestamp;    // 8 bytes - slot 1 (fits with address)
        uint64 expirationTimestamp;       // 8 bytes - slot 2
        uint8 yearsPurchased;             // 1 byte - slot 2 (max 255 years, enough)
        string tld;                       // 1+ slots (string storage)
    }

    // Mapping: full domain (e.g., "hayden.com") => DomainInfo
    mapping(string => DomainInfo) public domainInfo;
    
    // Mapping: TLD => price per year in wei
    mapping(string => uint256) public tldPrices;
    
    // Mapping: owner address => array of owned domains
    mapping(address => string[]) public ownerDomains;
    
    // USDC token address (set by owner)
    address public usdcToken;
    
    // Treasury contract address
    address public treasury;
    
    // Fractionalization contract address
    address public fractionalization;
    
    // Chainlink price feed for ETH/USD
    AggregatorV3Interface public ethUsdPriceFeed;
    
    // Fallback price (in USD with 8 decimals) if oracle fails - set by owner
    uint256 public fallbackETHPrice;
    uint256 public fallbackPriceTimestamp;
    
    // Minimum ETH price in USD (8 decimals) to prevent oracle manipulation
    uint256 public constant MIN_ETH_PRICE = 500 * 10**8; // $500 minimum (8 decimals)
    
    // Maximum fee percentage (in basis points, 1000 = 10%)
    uint256 public constant MAX_FEE_PERCENTAGE = 1000; // 10% maximum (in basis points)
    
    // Events
    event DomainRegistered(string indexed domain, address indexed owner, uint256 indexed numYears, string tld, uint256 expirationTimestamp);
    event DomainRenewed(string indexed domain, address indexed owner, uint256 indexed numYears, uint256 newExpirationTimestamp);
    event DomainExpired(string indexed domain, address indexed owner);
    event DomainTransferred(string indexed domain, address indexed oldOwner, address indexed newOwner);
    event TLDPriceSet(string indexed tld, uint256 price);
    event USDCAddressSet(address indexed usdcToken);
    event TreasuryAddressSet(address indexed treasury);
    event FractionalizationAddressSet(address indexed fractionalization);
    event ETHUSDPriceFeedSet(address indexed priceFeed);
    event FallbackPriceSet(uint256 price, uint256 timestamp);
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @dev Set the USDC token address
     * @param _usdcToken The USDC token contract address
     */
    function setUSDCAddress(address _usdcToken) external onlyOwner {
        if (_usdcToken == address(0)) revert InvalidUSDCAddress();
        usdcToken = _usdcToken;
        emit USDCAddressSet(_usdcToken);
    }
    
    /**
     * @dev Set the treasury contract address
     * @param _treasury The treasury contract address
     */
    function setTreasuryAddress(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidTreasuryAddress();
        treasury = _treasury;
        emit TreasuryAddressSet(_treasury);
    }
    
    /**
     * @dev Set the fractionalization contract address
     * @param _fractionalization The fractionalization contract address
     */
    function setFractionalizationAddress(address _fractionalization) external onlyOwner {
        if (_fractionalization == address(0)) revert InvalidFractionalizationAddress();
        fractionalization = _fractionalization;
        emit FractionalizationAddressSet(_fractionalization);
    }
    
    /**
     * @dev Set the Chainlink ETH/USD price feed address
     * @param _priceFeed The Chainlink AggregatorV3Interface price feed address
     */
    function setETHUSDPriceFeed(address _priceFeed) external onlyOwner {
        if (_priceFeed == address(0)) revert InvalidPriceFeedAddress();
        ethUsdPriceFeed = AggregatorV3Interface(_priceFeed);
        emit ETHUSDPriceFeedSet(_priceFeed);
    }
    
    /**
     * @dev Set fallback ETH price (in USD with 8 decimals) for when oracle fails
     * @param price The fallback price in USD with 8 decimals
     */
    function setFallbackETHPrice(uint256 price) external onlyOwner {
        if (price == 0) revert InvalidPriceFromOracle();
        require(price >= MIN_ETH_PRICE, "TLDRegistry: Fallback price below minimum");
        fallbackETHPrice = price;
        fallbackPriceTimestamp = block.timestamp;
        emit FallbackPriceSet(price, block.timestamp);
    }
    
    /**
     * @dev Get the latest ETH/USD price from Chainlink oracle with fallback
     * @return price The latest ETH price in USD (with 8 decimals)
     * @return timestamp The timestamp of the price update
     */
    function getLatestETHPrice() public view returns (uint256 price, uint256 timestamp) {
        // Try to get price from Chainlink oracle first
        if (address(ethUsdPriceFeed) != address(0)) {
            try this._tryGetOraclePrice() returns (uint256 oraclePrice, uint256 oracleTimestamp, bool success) {
                if (success) {
                    return (oraclePrice, oracleTimestamp);
                }
            } catch {
                // Oracle call failed, fall through to fallback
            }
        }
        
        // Use fallback price if oracle fails or not set
        if (fallbackETHPrice > 0) {
            return (fallbackETHPrice, fallbackPriceTimestamp);
        }
        
        // If no fallback, revert
        revert PriceFeedNotSet();
    }
    
    /**
     * @dev Internal function to try getting price from oracle (used in try-catch)
     */
    function _tryGetOraclePrice() external view returns (uint256 price, uint256 timestamp, bool success) {
        (
            /* uint80 roundID */,
            int256 priceInt,
            /* uint startedAt */,
            uint256 updatedAt,
            /* uint80 answeredInRound */
        ) = ethUsdPriceFeed.latestRoundData();
        
        // Validate price data
        if (priceInt > 0 && updatedAt > 0 && block.timestamp - updatedAt <= 3600) {
            uint256 price = uint256(priceInt);
            require(price >= MIN_ETH_PRICE, "TLDRegistry: Price below minimum");
            return (price, updatedAt, true);
        }
        
        return (0, 0, false);
    }
    
    /**
     * @dev Convert ETH amount (in wei) to USDC amount (with 6 decimals)
     * @param ethAmount Amount in wei (18 decimals)
     * @return usdcAmount Amount in USDC (6 decimals)
     */
    function convertETHToUSDC(uint256 ethAmount) public view returns (uint256) {
        (uint256 ethPriceInUSD, ) = getLatestETHPrice();
        // ethPriceInUSD has 8 decimals, ethAmount has 18 decimals
        // USDC has 6 decimals
        // Formula: (ethAmount * ethPriceInUSD) / (10^18 * 10^8) * 10^6
        // Simplified: (ethAmount * ethPriceInUSD) / 10^20
        return (ethAmount * ethPriceInUSD) / 1e20;
    }
    
    /**
     * @dev Set the price per year for a TLD
     * @param tld The TLD (e.g., "com", "net")
     * @param price The price per year in wei
     */
    function setTLDPrice(string calldata tld, uint256 price) external onlyOwner {
        tldPrices[tld] = price;
        emit TLDPriceSet(tld, price);
    }
    
    /**
     * @dev Get the total price for registering a domain for a given number of years
     * @param tld The TLD
     * @param numYears The number of years
     * @return The total price in wei
     */
    function getDomainPrice(string memory tld, uint256 numYears) public view returns (uint256) {
        if (numYears == 0 || numYears > 10) revert InvalidYears();
        uint256 pricePerYear = tldPrices[tld];
        if (pricePerYear == 0) revert TLDPriceNotSet();
        return pricePerYear * numYears;
    }
    
    /**
     * @dev Check if a domain is available
     * @param domain The full domain name (e.g., "hayden.com")
     * @return True if available, false if taken or expired
     */
    function isDomainAvailable(string memory domain) public view returns (bool) {
        string memory normalized = _normalizeDomain(domain);
        DomainInfo memory info = domainInfo[normalized];
        // Domain is available if it doesn't exist or has expired
        if (info.owner == address(0)) {
            return true;
        }
        return block.timestamp >= info.expirationTimestamp;
    }
    
    /**
     * @dev Register a domain with ETH payment
     * @param domain The domain name without TLD (e.g., "hayden")
     * @param tld The TLD (e.g., "com")
     * @param numYears The number of years to register
     */
    function registerDomain(
        string calldata domain,
        string calldata tld,
        uint256 numYears
    ) external payable nonReentrant {
        require(numYears > 0 && numYears <= 10, "TLDRegistry: Years must be between 1 and 10");
        
        string memory normalizedDomain = _normalizeDomain(domain);
        string memory normalizedTld = _normalizeDomain(tld);
        if (!_validateDomainName(normalizedDomain)) revert InvalidDomainFormat();
        if (!_validateDomainName(normalizedTld)) revert InvalidTLDFormat();
        string memory fullDomain = string(abi.encodePacked(normalizedDomain, ".", normalizedTld));
        if (!isDomainAvailable(fullDomain)) revert DomainNotAvailable();
        
        uint256 totalPrice = getDomainPrice(normalizedTld, numYears);
        if (msg.value < totalPrice) revert InsufficientPayment();
        
        // Calculate and deposit fee to treasury if treasury is set
        uint256 fee = 0;
        uint256 netPayment = msg.value;
        
        if (treasury != address(0)) {
            // Call treasury to calculate fee with explicit error handling
            (bool success, bytes memory data) = treasury.staticcall(
                abi.encodeWithSignature("calculateFee(string,uint256)", fullDomain, msg.value)
            );
            if (!success || data.length == 0) revert FeeCalculationFailed();
            fee = abi.decode(data, (uint256));
            _validateFee(fee, msg.value);
            if (fee > 0) {
                // Deposit fee to treasury
                (bool treasurySuccess, ) = treasury.call{value: fee}(
                    abi.encodeWithSignature("depositFee(string)", fullDomain)
                );
                if (!treasurySuccess) revert FeeDepositFailed();
                netPayment = msg.value - fee;
            }
        }
        
        // Ensure net payment covers the domain price
        if (netPayment < totalPrice) revert InsufficientPaymentAfterFee();
        
        // Refund any excess payment (after fee and domain price)
        uint256 excess = netPayment - totalPrice;
        if (excess > 0) {
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "TLDRegistry: Refund transfer failed");
        }
        
        uint64 expirationTimestamp = uint64(block.timestamp + (numYears * 365 days));
        
        // If domain was previously owned by someone else (expired), remove from old owner's list
        DomainInfo memory oldInfo = domainInfo[fullDomain];
        if (oldInfo.owner != address(0) && oldInfo.owner != msg.sender) {
            _removeDomainFromOwner(oldInfo.owner, fullDomain);
        }
        
        // Add to new owner's list if not already there
        if (oldInfo.owner != msg.sender) {
            ownerDomains[msg.sender].push(fullDomain);
        }
        
        domainInfo[fullDomain] = DomainInfo({
            owner: msg.sender,
            registrationTimestamp: uint64(block.timestamp),
            expirationTimestamp: expirationTimestamp,
            yearsPurchased: uint8(numYears),
            tld: normalizedTld
        });
        
        emit DomainRegistered(fullDomain, msg.sender, numYears, normalizedTld, expirationTimestamp);
    }
    
    /**
     * @dev Register a domain with USDC payment
     * @param domain The domain name without TLD
     * @param tld The TLD
     * @param numYears The number of years to register
     * @param usdcAmount The USDC amount (must match price)
     */
    function registerDomainWithUSDC(
        string calldata domain,
        string calldata tld,
        uint256 numYears,
        uint256 usdcAmount
    ) external nonReentrant {
        if (usdcToken == address(0)) revert InvalidUSDCAddress();
        if (numYears == 0 || numYears > 10) revert InvalidYears();
        
        string memory normalizedDomain = _normalizeDomain(domain);
        string memory normalizedTld = _normalizeDomain(tld);
        require(_validateDomainName(normalizedDomain), "TLDRegistry: Invalid domain name format");
        require(_validateDomainName(normalizedTld), "TLDRegistry: Invalid TLD format");
        string memory fullDomain = string(abi.encodePacked(normalizedDomain, ".", normalizedTld));
        require(isDomainAvailable(fullDomain), "TLDRegistry: Domain not available");
        
        uint256 totalPrice = getDomainPrice(normalizedTld, numYears);
        // Convert ETH price to USDC using Chainlink oracle
        uint256 usdcPrice = convertETHToUSDC(totalPrice);
        
        IERC20 usdc = IERC20(usdcToken);
        
        // Calculate and deposit fee to treasury if treasury is set
        // Calculate fee based on usdcPrice, not usdcAmount
        uint256 fee = 0;
        if (treasury != address(0)) {
            (bool success, bytes memory data) = treasury.staticcall(
                abi.encodeWithSignature("calculateFee(string,uint256)", fullDomain, usdcPrice)
            );
            require(success && data.length > 0, "TLDRegistry: Fee calculation failed");
            fee = abi.decode(data, (uint256));
            _validateFee(fee, usdcPrice);
        }
        
        // Calculate net price (what goes to contract after fee)
        uint256 netPrice = fee > 0 ? usdcPrice - fee : usdcPrice;
        
        // User must send at least the full USDC price (fee is deducted from price)
        require(usdcAmount >= usdcPrice, "TLDRegistry: Insufficient USDC amount");
        
        // Transfer fee to treasury if applicable
        if (fee > 0) {
            require(usdc.transferFrom(msg.sender, treasury, fee), "TLDRegistry: Fee transfer failed");
            (bool treasurySuccess, ) = treasury.call(
                abi.encodeWithSignature("depositFee(string)", fullDomain)
            );
            require(treasurySuccess, "TLDRegistry: Fee deposit failed");
        }
        
        // Transfer net price to contract (price minus fee)
        // Note: Excess amount (usdcAmount - usdcPrice) remains with user since we only transfer netPrice
        require(usdc.transferFrom(msg.sender, address(this), netPrice), "TLDRegistry: USDC transfer failed");
        
        // Register domain
        uint64 expirationTimestamp = uint64(block.timestamp + (numYears * 365 days));
        DomainInfo memory oldInfo = domainInfo[fullDomain];
        
        if (oldInfo.owner != address(0) && oldInfo.owner != msg.sender) {
            _removeDomainFromOwner(oldInfo.owner, fullDomain);
        }
        if (oldInfo.owner != msg.sender) {
            ownerDomains[msg.sender].push(fullDomain);
        }
        
        domainInfo[fullDomain] = DomainInfo({
            owner: msg.sender,
            registrationTimestamp: uint64(block.timestamp),
            expirationTimestamp: expirationTimestamp,
            yearsPurchased: uint8(numYears),
            tld: normalizedTld
        });
        
        emit DomainRegistered(fullDomain, msg.sender, numYears, normalizedTld, expirationTimestamp);
    }
    
    /**
     * @dev Renew a domain
     * @param domain The domain name without TLD
     * @param tld The TLD
     * @param numYears The number of years to extend
     */
    function renewDomain(
        string calldata domain,
        string calldata tld,
        uint256 numYears
    ) external payable nonReentrant {
        require(numYears > 0 && numYears <= 10, "TLDRegistry: Years must be between 1 and 10");
        
        string memory normalizedDomain = _normalizeDomain(domain);
        string memory normalizedTld = _normalizeDomain(tld);
        string memory fullDomain = string(abi.encodePacked(normalizedDomain, ".", normalizedTld));
        DomainInfo storage info = domainInfo[fullDomain];
        
        if (info.owner != msg.sender) revert NotDomainOwner();
        if (block.timestamp >= info.expirationTimestamp) revert DomainHasExpired();
        
        uint256 totalPrice = getDomainPrice(normalizedTld, numYears);
        require(msg.value >= totalPrice, "TLDRegistry: Insufficient payment");
        
        // Calculate and deposit fee to treasury if treasury is set
        uint256 fee = 0;
        uint256 netPayment = msg.value;
        
        if (treasury != address(0)) {
            (bool success, bytes memory data) = treasury.staticcall(
                abi.encodeWithSignature("calculateFee(string,uint256)", fullDomain, msg.value)
            );
            require(success && data.length > 0, "TLDRegistry: Fee calculation failed");
            fee = abi.decode(data, (uint256));
            _validateFee(fee, msg.value);
            if (fee > 0) {
                (bool treasurySuccess, ) = treasury.call{value: fee}(
                    abi.encodeWithSignature("depositFee(string)", fullDomain)
                );
                require(treasurySuccess, "TLDRegistry: Fee deposit failed");
                netPayment = msg.value - fee;
            }
        }
        
        // Ensure net payment covers the domain price
        require(netPayment >= totalPrice, "TLDRegistry: Insufficient payment after fee");
        
        // Refund any excess payment (after fee and domain price)
        uint256 excess = netPayment - totalPrice;
        if (excess > 0) {
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "TLDRegistry: Refund transfer failed");
        }
        
        // Extend expiration
        if (block.timestamp >= info.expirationTimestamp) {
            info.expirationTimestamp = uint64(block.timestamp + (numYears * 365 days));
        } else {
            info.expirationTimestamp = uint64(uint256(info.expirationTimestamp) + (numYears * 365 days));
        }
        // Prevent overflow: max 100 years total
        uint256 newYearsPurchased = uint256(info.yearsPurchased) + numYears;
        require(newYearsPurchased <= 100, "TLDRegistry: Years purchased exceeds maximum");
        info.yearsPurchased = uint8(newYearsPurchased);
        
        emit DomainRenewed(fullDomain, msg.sender, numYears, info.expirationTimestamp);
    }
    
    /**
     * @dev Renew a domain with USDC
     * @param domain The domain name without TLD
     * @param tld The TLD
     * @param numYears The number of years to extend
     * @param usdcAmount The USDC amount
     */
    function renewDomainWithUSDC(
        string calldata domain,
        string calldata tld,
        uint256 numYears,
        uint256 usdcAmount
    ) external nonReentrant {
        if (usdcToken == address(0)) revert InvalidUSDCAddress();
        if (numYears == 0 || numYears > 10) revert InvalidYears();
        
        string memory normalizedDomain = _normalizeDomain(domain);
        string memory normalizedTld = _normalizeDomain(tld);
        string memory fullDomain = string(abi.encodePacked(normalizedDomain, ".", normalizedTld));
        DomainInfo storage info = domainInfo[fullDomain];
        
        if (info.owner != msg.sender) revert NotDomainOwner();
        if (block.timestamp >= info.expirationTimestamp) revert DomainHasExpired();
        
        uint256 totalPrice = getDomainPrice(normalizedTld, numYears);
        // Convert ETH price to USDC using Chainlink oracle
        uint256 usdcPrice = convertETHToUSDC(totalPrice);
        
        IERC20 usdc = IERC20(usdcToken);
        
        // Calculate and deposit fee to treasury if treasury is set
        // Calculate fee based on usdcPrice, not usdcAmount
        uint256 fee = 0;
        if (treasury != address(0)) {
            (bool success, bytes memory data) = treasury.staticcall(
                abi.encodeWithSignature("calculateFee(string,uint256)", fullDomain, usdcPrice)
            );
            if (!success || data.length == 0) revert FeeCalculationFailed();
            fee = abi.decode(data, (uint256));
            _validateFee(fee, usdcPrice);
        }
        
        // Calculate net price (what goes to contract after fee)
        uint256 netPrice = fee > 0 ? usdcPrice - fee : usdcPrice;
        
        // User must send at least the full USDC price (fee is deducted from price)
        if (usdcAmount < usdcPrice) revert InsufficientPayment();
        
        // Transfer fee to treasury if applicable
        if (fee > 0) {
            if (!usdc.transferFrom(msg.sender, treasury, fee)) revert USDCTransferFailed();
            (bool treasurySuccess, ) = treasury.call(
                abi.encodeWithSignature("depositFee(string)", fullDomain)
            );
            if (!treasurySuccess) revert FeeDepositFailed();
        }
        
        // Transfer net price to contract (price minus fee)
        // Note: Excess amount (usdcAmount - usdcPrice) remains with user since we only transfer netPrice
        if (!usdc.transferFrom(msg.sender, address(this), netPrice)) revert USDCTransferFailed();
        
        // Extend expiration
        if (block.timestamp >= info.expirationTimestamp) {
            info.expirationTimestamp = uint64(block.timestamp + (numYears * 365 days));
        } else {
            info.expirationTimestamp = uint64(uint256(info.expirationTimestamp) + (numYears * 365 days));
        }
        // Prevent overflow: max 100 years total
        uint256 newYearsPurchased = uint256(info.yearsPurchased) + numYears;
        require(newYearsPurchased <= 100, "TLDRegistry: Years purchased exceeds maximum");
        info.yearsPurchased = uint8(newYearsPurchased);
        
        emit DomainRenewed(fullDomain, msg.sender, numYears, info.expirationTimestamp);
    }
    
    /**
     * @dev Get all domains owned by an address
     * @param owner The owner address
     * @return Array of domain names
     */
    function getOwnerDomains(address owner) external view returns (string[] memory) {
        return ownerDomains[owner];
    }
    
    /**
     * @dev Batch register multiple domains in one transaction (gas efficient)
     * @param domains Array of domain names (without TLD)
     * @param tlds Array of TLDs
     * @param numYearsArray Array of years for each domain
     */
    function batchRegisterDomains(
        string[] calldata domains,
        string[] calldata tlds,
        uint256[] calldata numYearsArray
    ) external payable nonReentrant {
        require(
            domains.length == tlds.length && domains.length == numYearsArray.length,
            "TLDRegistry: Array length mismatch"
        );
        require(domains.length > 0 && domains.length <= 10, "TLDRegistry: Invalid batch size");
        
        uint256 totalCost = 0;
        
        // Calculate total cost and validate all domains
        for (uint256 i = 0; i < domains.length; i++) {
            string memory normalizedDomain = _normalizeDomain(domains[i]);
            string memory normalizedTld = _normalizeDomain(tlds[i]);
            if (!_validateDomainName(normalizedDomain)) revert InvalidDomainFormat();
            if (!_validateDomainName(normalizedTld)) revert InvalidTLDFormat();
            string memory fullDomain = string(abi.encodePacked(normalizedDomain, ".", normalizedTld));
            if (!isDomainAvailable(fullDomain)) revert DomainNotAvailable();
            
            uint256 price = getDomainPrice(normalizedTld, numYearsArray[i]);
            totalCost += price;
        }
        
        uint256 totalFees = 0;
        if (treasury != address(0)) {
            // Calculate fees for each domain
            for (uint256 i = 0; i < domains.length; i++) {
                string memory normalizedDomain = _normalizeDomain(domains[i]);
                string memory normalizedTld = _normalizeDomain(tlds[i]);
                string memory fullDomain = string(abi.encodePacked(normalizedDomain, ".", normalizedTld));
                uint256 price = getDomainPrice(normalizedTld, numYearsArray[i]);
                
                (bool success, bytes memory data) = treasury.staticcall(
                    abi.encodeWithSignature("calculateFee(string,uint256)", fullDomain, price)
                );
                if (success && data.length > 0) {
                    uint256 fee = abi.decode(data, (uint256));
                    totalFees += fee;
                }
            }
        }
        
        require(msg.value >= totalCost + totalFees, "TLDRegistry: Insufficient payment");
        
        // Register all domains and deposit fees per domain
        for (uint256 i = 0; i < domains.length; i++) {
            string memory normalizedDomain = _normalizeDomain(domains[i]);
            string memory normalizedTld = _normalizeDomain(tlds[i]);
            string memory fullDomain = string(abi.encodePacked(normalizedDomain, ".", normalizedTld));
            uint256 price = getDomainPrice(normalizedTld, numYearsArray[i]);
            
            // Deposit fee for this specific domain if treasury is set
            if (treasury != address(0)) {
                (bool success, bytes memory data) = treasury.staticcall(
                    abi.encodeWithSignature("calculateFee(string,uint256)", fullDomain, price)
                );
                if (success && data.length > 0) {
                    uint256 fee = abi.decode(data, (uint256));
                    if (fee > 0) {
                        (bool treasurySuccess, ) = treasury.call{value: fee}(
                            abi.encodeWithSignature("depositFee(string)", fullDomain)
                        );
                        require(treasurySuccess, "TLDRegistry: Fee deposit failed");
                    }
                }
            }
            
            uint64 expirationTimestamp = uint64(block.timestamp + (numYearsArray[i] * 365 days));
            DomainInfo memory oldInfo = domainInfo[fullDomain];
            
            if (oldInfo.owner != address(0) && oldInfo.owner != msg.sender) {
                _removeDomainFromOwner(oldInfo.owner, fullDomain);
            }
            if (oldInfo.owner != msg.sender) {
                ownerDomains[msg.sender].push(fullDomain);
            }
            
            domainInfo[fullDomain] = DomainInfo({
                owner: msg.sender,
                registrationTimestamp: uint64(block.timestamp),
                expirationTimestamp: expirationTimestamp,
                yearsPurchased: uint8(numYearsArray[i]),
                tld: normalizedTld
            });
            
            emit DomainRegistered(fullDomain, msg.sender, numYearsArray[i], normalizedTld, expirationTimestamp);
        }
        
        // Refund excess payment (after fees and domain costs)
        if (msg.value > totalCost + totalFees) {
            uint256 excess = msg.value - totalCost - totalFees;
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "TLDRegistry: Refund transfer failed");
        }
    }
    
    /**
     * @dev Batch renew multiple domains in one transaction (gas efficient)
     * @param domains Array of domain names (without TLD)
     * @param tlds Array of TLDs
     * @param numYearsArray Array of years to extend for each domain
     */
    function batchRenewDomains(
        string[] calldata domains,
        string[] calldata tlds,
        uint256[] calldata numYearsArray
    ) external payable nonReentrant {
        require(
            domains.length == tlds.length && domains.length == numYearsArray.length,
            "TLDRegistry: Array length mismatch"
        );
        require(domains.length > 0 && domains.length <= 10, "TLDRegistry: Invalid batch size");
        
        uint256 totalCost = 0;
        
        // Calculate total cost and validate all domains
        for (uint256 i = 0; i < domains.length; i++) {
            string memory normalizedDomain = _normalizeDomain(domains[i]);
            string memory normalizedTld = _normalizeDomain(tlds[i]);
            string memory fullDomain = string(abi.encodePacked(normalizedDomain, ".", normalizedTld));
            DomainInfo storage info = domainInfo[fullDomain];
            
            if (info.owner != msg.sender) revert NotDomainOwner();
            if (block.timestamp >= info.expirationTimestamp) revert DomainHasExpired();
            
            uint256 price = getDomainPrice(normalizedTld, numYearsArray[i]);
            totalCost += price;
        }
        
        uint256 totalFees = 0;
        if (treasury != address(0)) {
            // Calculate fees for each domain
            for (uint256 i = 0; i < domains.length; i++) {
                string memory normalizedDomain = _normalizeDomain(domains[i]);
                string memory normalizedTld = _normalizeDomain(tlds[i]);
                string memory fullDomain = string(abi.encodePacked(normalizedDomain, ".", normalizedTld));
                uint256 price = getDomainPrice(normalizedTld, numYearsArray[i]);
                
                (bool success, bytes memory data) = treasury.staticcall(
                    abi.encodeWithSignature("calculateFee(string,uint256)", fullDomain, price)
                );
                if (success && data.length > 0) {
                    uint256 fee = abi.decode(data, (uint256));
                    totalFees += fee;
                }
            }
        }
        
        require(msg.value >= totalCost + totalFees, "TLDRegistry: Insufficient payment");
        
        // Renew all domains and deposit fees per domain
        for (uint256 i = 0; i < domains.length; i++) {
            string memory normalizedDomain = _normalizeDomain(domains[i]);
            string memory normalizedTld = _normalizeDomain(tlds[i]);
            string memory fullDomain = string(abi.encodePacked(normalizedDomain, ".", normalizedTld));
            uint256 price = getDomainPrice(normalizedTld, numYearsArray[i]);
            
            // Deposit fee for this specific domain if treasury is set
            if (treasury != address(0)) {
                (bool success, bytes memory data) = treasury.staticcall(
                    abi.encodeWithSignature("calculateFee(string,uint256)", fullDomain, price)
                );
                if (success && data.length > 0) {
                    uint256 fee = abi.decode(data, (uint256));
                    if (fee > 0) {
                        (bool treasurySuccess, ) = treasury.call{value: fee}(
                            abi.encodeWithSignature("depositFee(string)", fullDomain)
                        );
                        require(treasurySuccess, "TLDRegistry: Fee deposit failed");
                    }
                }
            }
            
            DomainInfo storage info = domainInfo[fullDomain];
            
            // Extend expiration
            if (block.timestamp >= info.expirationTimestamp) {
                info.expirationTimestamp = uint64(block.timestamp + (numYearsArray[i] * 365 days));
            } else {
                info.expirationTimestamp = uint64(uint256(info.expirationTimestamp) + (numYearsArray[i] * 365 days));
            }
            // Prevent overflow: max 100 years total
            uint256 newYearsPurchased = uint256(info.yearsPurchased) + numYearsArray[i];
            require(newYearsPurchased <= 100, "TLDRegistry: Years purchased exceeds maximum");
            info.yearsPurchased = uint8(newYearsPurchased);
            
            emit DomainRenewed(fullDomain, msg.sender, numYearsArray[i], info.expirationTimestamp);
        }
        
        // Refund excess payment
        if (msg.value > totalCost + totalFees) {
            uint256 excess = msg.value - totalCost - totalFees;
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "TLDRegistry: Refund transfer failed");
        }
    }
    
    /**
     * @dev Get paginated domains owned by an address
     * @param owner The owner address
     * @param offset The starting index
     * @param limit The maximum number of domains to return
     * @return Array of domain names
     * @return Total count of domains owned
     */
    function getOwnerDomainsPaginated(
        address owner,
        uint256 offset,
        uint256 limit
    ) external view returns (string[] memory, uint256) {
        string[] memory allDomains = ownerDomains[owner];
        uint256 total = allDomains.length;
        
        if (offset >= total) {
            return (new string[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        uint256 resultLength = end - offset;
        string[] memory result = new string[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allDomains[offset + i];
        }
        
        return (result, total);
    }
    
    /**
     * @dev Check if a domain is expired
     * @param domain The full domain name
     * @return True if expired
     */
    function isDomainExpired(string calldata domain) external view returns (bool) {
        string memory normalized = _normalizeDomain(domain);
        DomainInfo memory info = domainInfo[normalized];
        if (info.owner == address(0)) {
            return true; // Not registered, considered expired
        }
        return block.timestamp >= info.expirationTimestamp;
    }
    
    /**
     * @dev Internal function to validate fee
     * @param fee The fee amount
     * @param payment The payment amount
     */
    function _validateFee(uint256 fee, uint256 payment) internal pure {
        require(fee <= payment, "TLDRegistry: Fee exceeds payment");
        uint256 feePercentage = (fee * 10000) / payment;
        require(feePercentage <= MAX_FEE_PERCENTAGE, "TLDRegistry: Fee percentage too high");
    }
    
    /**
     * @dev Internal function to normalize domain name to lowercase
     * @param domain The domain name to normalize
     * @return normalized The normalized domain name
     */
    function _normalizeDomain(string memory domain) internal pure returns (string memory) {
        bytes memory domainBytes = bytes(domain);
        require(domainBytes.length > 0, "TLDRegistry: Domain cannot be empty");
        require(domainBytes.length <= 253, "TLDRegistry: Domain too long"); // DNS max length
        bytes memory normalized = new bytes(domainBytes.length);
        
        for (uint256 i = 0; i < domainBytes.length; i++) {
            // Convert uppercase to lowercase (A-Z -> a-z)
            if (domainBytes[i] >= 0x41 && domainBytes[i] <= 0x5A) {
                normalized[i] = bytes1(uint8(domainBytes[i]) + 32);
            } else {
                normalized[i] = domainBytes[i];
            }
        }
        
        return string(normalized);
    }
    
    /**
     * @dev Internal function to validate domain name format
     * @param domain The domain name to validate
     * @return True if valid
     */
    function _validateDomainName(string memory domain) internal pure returns (bool) {
        bytes memory domainBytes = bytes(domain);
        
        // Check length (min 1, max 63 characters per RFC 1035)
        if (domainBytes.length == 0 || domainBytes.length > 63) {
            return false;
        }
        
        // Minimum practical length (recommended 3+ characters, but allow 1+ for flexibility)
        // This is already covered by length > 0 check above
        
        // Must start and end with alphanumeric
        if (!_isAlphanumeric(domainBytes[0]) || !_isAlphanumeric(domainBytes[domainBytes.length - 1])) {
            return false;
        }
        
        // Check for consecutive hyphens and valid characters
        for (uint256 i = 0; i < domainBytes.length; i++) {
            bytes1 char = domainBytes[i];
            
            // Allow alphanumeric and hyphens
            if (!_isAlphanumeric(char) && char != 0x2D) { // 0x2D is hyphen
                return false;
            }
            
            // Check for consecutive hyphens
            if (i > 0 && char == 0x2D && domainBytes[i - 1] == 0x2D) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev Internal function to check if character is alphanumeric
     */
    function _isAlphanumeric(bytes1 char) private pure returns (bool) {
        return (char >= 0x30 && char <= 0x39) || // 0-9
               (char >= 0x41 && char <= 0x5A) || // A-Z
               (char >= 0x61 && char <= 0x7A);   // a-z
    }
    
    /**
     * @dev Internal function to remove domain from owner's list
     */
    function _removeDomainFromOwner(address owner, string memory domain) internal {
        string[] storage domains = ownerDomains[owner];
        for (uint256 i = 0; i < domains.length; i++) {
            if (keccak256(bytes(domains[i])) == keccak256(bytes(domain))) {
                domains[i] = domains[domains.length - 1];
                domains.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Transfer domain ownership to another address (domain owner only)
     * @param domain The full domain name
     * @param newOwner The new owner address
     */
    function transferDomain(string calldata domain, address newOwner) external {
        string memory normalized = _normalizeDomain(domain);
        DomainInfo storage info = domainInfo[normalized];
        if (info.owner != msg.sender) revert NotDomainOwner();
        if (newOwner == address(0)) revert InvalidNewOwner();
        if (newOwner == msg.sender) revert CannotTransferToSelf();
        
        // Check if domain is expired
        if (block.timestamp >= info.expirationTimestamp) revert DomainHasExpired();
        
        address oldOwner = info.owner;
        info.owner = newOwner;
        
        // Update owner domains mapping
        _removeDomainFromOwner(oldOwner, normalized);
        ownerDomains[newOwner].push(normalized);
        
        emit DomainTransferred(normalized, oldOwner, newOwner);
    }
    
    /**
     * @dev Transfer domain ownership (for fractionalization transfer)
     * @param domain The full domain name
     * @param newOwner The new owner address
     */
    function transferDomainOwnership(string calldata domain, address newOwner) external {
        // Allow fractionalization contract to transfer
        if (fractionalization == address(0) || msg.sender != fractionalization) {
            revert NotDomainOwner(); // Reuse error for unauthorized
        }
        
        string memory normalized = _normalizeDomain(domain);
        DomainInfo storage info = domainInfo[normalized];
        if (info.owner == address(0)) revert DomainNotFound();
        if (newOwner == address(0)) revert InvalidNewOwner();
        
        address oldOwner = info.owner;
        info.owner = newOwner;
        
        // Update owner domains mapping
        _removeDomainFromOwner(oldOwner, normalized);
        ownerDomains[newOwner].push(normalized);
        
        emit DomainTransferred(normalized, oldOwner, newOwner);
    }
    
    /**
     * @dev Renew domain using treasury funds (called by treasury)
     * @param domain The domain name without TLD
     * @param tld The TLD
     * @param numYears Number of years to renew
     */
    function renewDomainFromTreasury(
        string calldata domain,
        string calldata tld,
        uint256 numYears
    ) external {
        if (treasury == address(0)) revert TreasuryNotSet();
        if (msg.sender != treasury) revert OnlyTreasuryCanRenew();
        
        string memory normalizedDomain = _normalizeDomain(domain);
        string memory normalizedTld = _normalizeDomain(tld);
        string memory fullDomain = string(abi.encodePacked(normalizedDomain, ".", normalizedTld));
        DomainInfo storage info = domainInfo[fullDomain];
        
        if (info.owner == address(0)) revert DomainNotFound();
        
        // Price is already paid by treasury, just renew
        // Extend expiration
        if (block.timestamp >= info.expirationTimestamp) {
            info.expirationTimestamp = uint64(block.timestamp + (numYears * 365 days));
        } else {
            info.expirationTimestamp = uint64(uint256(info.expirationTimestamp) + (numYears * 365 days));
        }
        // Prevent overflow: max 100 years total
        uint256 newYearsPurchased = uint256(info.yearsPurchased) + numYears;
        require(newYearsPurchased <= 100, "TLDRegistry: Years purchased exceeds maximum");
        info.yearsPurchased = uint8(newYearsPurchased);
        
        emit DomainRenewed(fullDomain, info.owner, numYears, info.expirationTimestamp);
    }
    
    /**
     * @dev Withdraw ETH from contract (only owner)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @dev Withdraw USDC from contract (only owner)
     */
    function withdrawUSDC() external onlyOwner {
        require(usdcToken != address(0), "TLDRegistry: USDC address not set");
        IERC20 usdc = IERC20(usdcToken);
        uint256 balance = usdc.balanceOf(address(this));
        require(usdc.transfer(owner(), balance), "TLDRegistry: USDC transfer failed");
    }
}

