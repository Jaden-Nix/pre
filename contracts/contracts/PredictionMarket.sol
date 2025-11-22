// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PredictionMarket
 * @dev On-chain prediction market contract for Predora
 * Deployed on BSC Testnet for real betting with testnet BNB
 * 
 * Security improvements:
 * - Reentrancy protection with ReentrancyGuard pattern
 * - Proper fee tracking
 * - SafeMath checks for overflows
 * - Better access control
 */
contract PredictionMarket {
    
    struct Market {
        uint256 id;
        string title;
        string description;
        address creator;
        uint256 createdAt;
        uint256 resolutionTime;
        bool isResolved;
        bool outcome; // true = YES, false = NO
        uint256 yesPool;
        uint256 noPool;
        uint256 totalVolume;
        MarketStatus status;
        uint256 resolutionSubmittedAt; // When resolution was submitted
        bool autoPayoutTriggered; // Whether auto-payout has been triggered
    }
    
    enum MarketStatus { ACTIVE, DISPUTED, RESOLVED, FINALIZED, CANCELLED }
    
    struct Bet {
        address user;
        uint256 marketId;
        uint256 amount;
        bool pick; // true = YES, false = NO
        uint256 timestamp;
        bool claimed;
    }
    
    // State variables
    uint256 public marketCounter;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => Bet[]) public marketBets;
    mapping(address => uint256[]) public userBets;
    mapping(uint256 => mapping(address => uint256)) public userBetIndex;
    
    // Payout tracking: marketId => user address => has been paid out
    mapping(uint256 => mapping(address => bool)) public hasReceivedPayout;
    
    // Platform fee tracking
    uint256 public platformFeeBps = 100; // 1% = 100 basis points
    uint256 public accumulatedFees; // Track fees separately
    address public platformFeeRecipient;
    address public admin;
    
    // Reentrancy guard
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private reentrancyStatus;
    
    // Events
    event MarketCreated(uint256 indexed marketId, string title, address indexed creator);
    event BetPlaced(uint256 indexed marketId, address indexed user, uint256 amount, bool pick);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event MarketFinalized(uint256 indexed marketId); // Auto-finalized after 30-min dispute window
    event AutoPayoutTriggered(uint256 indexed marketId); // Auto-payout started
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event MarketDisputed(uint256 indexed marketId, address indexed disputor);
    
    constructor() {
        admin = msg.sender;
        platformFeeRecipient = msg.sender;
        reentrancyStatus = NOT_ENTERED;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }
    
    modifier nonReentrant() {
        require(reentrancyStatus != ENTERED, "Reentrancy detected");
        reentrancyStatus = ENTERED;
        _;
        reentrancyStatus = NOT_ENTERED;
    }
    
    /**
     * @dev Create a new prediction market
     */
    function createMarket(
        string memory _title,
        string memory _description,
        uint256 _resolutionTime
    ) external returns (uint256) {
        require(_resolutionTime > block.timestamp, "Resolution time must be in the future");
        require(bytes(_title).length > 0, "Title cannot be empty");
        
        marketCounter++;
        
        markets[marketCounter] = Market({
            id: marketCounter,
            title: _title,
            description: _description,
            creator: msg.sender,
            createdAt: block.timestamp,
            resolutionTime: _resolutionTime,
            isResolved: false,
            outcome: false,
            yesPool: 0,
            noPool: 0,
            totalVolume: 0,
            status: MarketStatus.ACTIVE,
            resolutionSubmittedAt: 0,
            autoPayoutTriggered: false
        });
        
        emit MarketCreated(marketCounter, _title, msg.sender);
        
        return marketCounter;
    }
    
    /**
     * @dev Place a bet on a market - FIXED: Added reentrancy protection
     */
    function placeBet(uint256 _marketId, bool _pick) external payable nonReentrant {
        Market storage market = markets[_marketId];
        
        require(market.id != 0, "Market does not exist");
        require(!market.isResolved, "Market is already resolved");
        require(market.status == MarketStatus.ACTIVE, "Market is not active");
        require(block.timestamp < market.resolutionTime, "Market has expired");
        require(msg.value >= 0.001 ether, "Minimum bet: 0.001 BNB");
        require(msg.value <= 100 ether, "Maximum bet: 100 BNB");
        
        // Record the bet
        Bet memory newBet = Bet({
            user: msg.sender,
            marketId: _marketId,
            amount: msg.value,
            pick: _pick,
            timestamp: block.timestamp,
            claimed: false
        });
        
        marketBets[_marketId].push(newBet);
        userBets[msg.sender].push(_marketId);
        userBetIndex[_marketId][msg.sender] = marketBets[_marketId].length - 1;
        
        // Update pools (AMM automatically adjusts odds)
        if (_pick) {
            market.yesPool += msg.value;
        } else {
            market.noPool += msg.value;
        }
        market.totalVolume += msg.value;
        
        emit BetPlaced(_marketId, msg.sender, msg.value, _pick);
    }
    
    /**
     * @dev Batch place multiple bets in one transaction (for Quick Play pledge pool)
     * @param _marketIds Array of market IDs to bet on
     * @param _picks Array of picks (true = YES, false = NO)
     * @param _amounts Array of bet amounts in wei
     * 
     * Example: User votes YES on market 5, NO on market 7, YES on market 9
     *   _marketIds = [5, 7, 9]
     *   _picks = [true, false, true]
     *   _amounts = [0.01 ether, 0.02 ether, 0.015 ether]
     *   msg.value = 0.045 ether (total)
     */
    function placeBatchBets(
        uint256[] memory _marketIds,
        bool[] memory _picks,
        uint256[] memory _amounts
    ) external payable nonReentrant {
        require(_marketIds.length > 0, "Empty batch");
        require(_marketIds.length == _picks.length, "Arrays length mismatch");
        require(_marketIds.length == _amounts.length, "Arrays length mismatch");
        require(_marketIds.length <= 50, "Max 50 bets per batch");
        
        // Calculate total required amount
        uint256 totalRequired = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            require(_amounts[i] >= 0.001 ether, "Minimum bet: 0.001 BNB");
            require(_amounts[i] <= 100 ether, "Maximum bet: 100 BNB");
            totalRequired += _amounts[i];
        }
        
        require(msg.value == totalRequired, "Incorrect total amount sent");
        
        // Place each bet
        for (uint256 i = 0; i < _marketIds.length; i++) {
            uint256 marketId = _marketIds[i];
            bool pick = _picks[i];
            uint256 amount = _amounts[i];
            
            Market storage market = markets[marketId];
            
            require(market.id != 0, "Market does not exist");
            require(!market.isResolved, "Market is already resolved");
            require(market.status == MarketStatus.ACTIVE, "Market is not active");
            require(block.timestamp < market.resolutionTime, "Market has expired");
            
            // Record the bet
            Bet memory newBet = Bet({
                user: msg.sender,
                marketId: marketId,
                amount: amount,
                pick: pick,
                timestamp: block.timestamp,
                claimed: false
            });
            
            marketBets[marketId].push(newBet);
            userBets[msg.sender].push(marketId);
            userBetIndex[marketId][msg.sender] = marketBets[marketId].length - 1;
            
            // Update AMM pools
            if (pick) {
                market.yesPool += amount;
            } else {
                market.noPool += amount;
            }
            market.totalVolume += amount;
            
            emit BetPlaced(marketId, msg.sender, amount, pick);
        }
    }
    
    /**
     * @dev Resolve a market (admin only) - starts 30-min dispute window
     */
    function resolveMarket(uint256 _marketId, bool _outcome) external onlyAdmin {
        Market storage market = markets[_marketId];
        
        require(market.id != 0, "Market does not exist");
        require(!market.isResolved, "Market is already resolved");
        require(market.status != MarketStatus.DISPUTED, "Cannot resolve disputed market");
        
        market.isResolved = true;
        market.outcome = _outcome;
        market.status = MarketStatus.RESOLVED;
        market.resolutionSubmittedAt = block.timestamp; // Start dispute window (30 min)
        
        emit MarketResolved(_marketId, _outcome);
    }

    /**
     * @dev Auto-finalize and payout market after 30-min dispute window
     * WARNING: Use batch processing for markets with >100 bets to avoid gas limits
     */
    function autoFinalizeAndPayout(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        
        require(market.id != 0, "Market does not exist");
        require(market.status == MarketStatus.RESOLVED, "Market must be resolved");
        require(market.resolutionSubmittedAt > 0, "Resolution not submitted");
        require(block.timestamp >= market.resolutionSubmittedAt + 30 minutes, "Dispute window still open");
        require(!market.autoPayoutTriggered, "Auto-payout already triggered");
        
        market.status = MarketStatus.FINALIZED;
        market.autoPayoutTriggered = true;
        
        emit MarketFinalized(_marketId);
        emit AutoPayoutTriggered(_marketId);
        
        // Auto-distribute winnings to all winners
        _distributeWinnings(_marketId);
    }
    
    /**
     * @dev Batch payout for large markets (>100 bets) - FIXED: Reentrancy protection
     * Processes winners in chunks to avoid gas limit issues
     */
    function batchDistributeWinnings(uint256 _marketId, uint256 startIdx, uint256 endIdx) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.FINALIZED, "Market must be finalized first");
        
        Bet[] storage bets = marketBets[_marketId];
        require(endIdx <= bets.length, "Index out of bounds");
        require(startIdx < endIdx, "Invalid range");
        require(market.yesPool + market.noPool > 0, "No pool");
        
        uint256 winningPool = market.outcome ? market.yesPool : market.noPool;
        uint256 losingPool = market.outcome ? market.noPool : market.yesPool;
        uint256 platformFee = (losingPool * platformFeeBps) / 10000;
        uint256 payoutPool = market.totalVolume - platformFee;
        
        // Mark all as claimed FIRST (Checks-Effects-Interactions)
        for (uint256 i = startIdx; i < endIdx; i++) {
            if (bets[i].pick == market.outcome && !bets[i].claimed && !hasReceivedPayout[_marketId][bets[i].user]) {
                bets[i].claimed = true;
                hasReceivedPayout[_marketId][bets[i].user] = true;
            }
        }
        
        // Then transfer AFTER state updates
        for (uint256 i = startIdx; i < endIdx; i++) {
            if (bets[i].pick == market.outcome && hasReceivedPayout[_marketId][bets[i].user]) {
                uint256 payout = (bets[i].amount * payoutPool) / winningPool;
                
                (bool success, ) = payable(bets[i].user).call{value: payout}("");
                require(success, "Payout failed");
                
                emit WinningsClaimed(_marketId, bets[i].user, payout);
            }
        }
    }

    /**
     * @dev Internal: Distribute winnings to all winners - FIXED: Track fees, better state management
     */
    function _distributeWinnings(uint256 _marketId) internal {
        Market storage market = markets[_marketId];
        Bet[] storage bets = marketBets[_marketId];
        
        uint256 winningPool = market.outcome ? market.yesPool : market.noPool;
        uint256 losingPool = market.outcome ? market.noPool : market.yesPool;
        uint256 platformFee = (losingPool * platformFeeBps) / 10000;
        uint256 payoutPool = market.totalVolume - platformFee;
        
        // Accumulate fees instead of immediate transfer
        if (platformFee > 0) {
            accumulatedFees += platformFee;
        }
        
        // Prevent division by zero
        if (winningPool == 0) {
            return;
        }
        
        // Update state FIRST, then transfer
        for (uint256 i = 0; i < bets.length; i++) {
            if (bets[i].pick == market.outcome && !bets[i].claimed && !hasReceivedPayout[_marketId][bets[i].user]) {
                bets[i].claimed = true;
                hasReceivedPayout[_marketId][bets[i].user] = true;
            }
        }
        
        // Now distribute to all winners AFTER state updates
        for (uint256 i = 0; i < bets.length; i++) {
            if (bets[i].pick == market.outcome && hasReceivedPayout[_marketId][bets[i].user]) {
                uint256 payout = (bets[i].amount * payoutPool) / winningPool;
                
                (bool success, ) = payable(bets[i].user).call{value: payout}("");
                require(success, "Payout failed");
                
                emit WinningsClaimed(_marketId, bets[i].user, payout);
            }
        }
    }
    
    /**
     * @dev Claim winnings for a resolved market - FIXED: Added reentrancy protection
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        
        require(market.isResolved, "Market is not resolved");
        require(market.status == MarketStatus.RESOLVED || market.status == MarketStatus.FINALIZED, "Market status invalid");
        
        Bet[] storage bets = marketBets[_marketId];
        uint256 totalPayout = 0;
        
        uint256 winningPool = market.outcome ? market.yesPool : market.noPool;
        uint256 losingPool = market.outcome ? market.noPool : market.yesPool;
        
        // Prevent division by zero
        require(winningPool > 0, "No winning pool");
        
        // Calculate fees and payout pool once
        uint256 platformFee = (losingPool * platformFeeBps) / 10000;
        uint256 payoutPool = market.totalVolume - platformFee;
        
        // Find all winning bets by this user and mark them claimed FIRST
        for (uint256 i = 0; i < bets.length; i++) {
            if (bets[i].user == msg.sender && !bets[i].claimed && bets[i].pick == market.outcome) {
                uint256 payout = (bets[i].amount * payoutPool) / winningPool;
                totalPayout += payout;
                bets[i].claimed = true; // Update state BEFORE transfer
            }
        }
        
        require(totalPayout > 0, "No winnings to claim");
        
        // Transfer winnings AFTER state updates (Checks-Effects-Interactions pattern)
        (bool success, ) = payable(msg.sender).call{value: totalPayout}("");
        require(success, "Transfer failed");
        
        emit WinningsClaimed(_marketId, msg.sender, totalPayout);
    }
    
    /**
     * @dev Dispute a market outcome
     */
    function disputeMarket(uint256 _marketId) external payable {
        Market storage market = markets[_marketId];
        
        require(market.id != 0, "Market does not exist");
        require(market.isResolved, "Market must be resolved to dispute");
        require(market.status == MarketStatus.RESOLVED, "Market already disputed");
        require(msg.value >= 0.01 ether, "Dispute requires 0.01 BNB stake");
        require(msg.value <= 100 ether, "Stake too large");
        
        market.status = MarketStatus.DISPUTED;
        
        emit MarketDisputed(_marketId, msg.sender);
        
        // Dispute stake is now locked in contract for jury voting
        // Note: Current implementation does not track individual dispute stakes
        // Future: Implement refund mechanism based on jury vote outcome
    }
    
    /**
     * @dev Get market details
     */
    function getMarket(uint256 _marketId) external view returns (Market memory) {
        return markets[_marketId];
    }
    
    /**
     * @dev Get all bets for a market
     */
    function getMarketBets(uint256 _marketId) external view returns (Bet[] memory) {
        return marketBets[_marketId];
    }
    
    /**
     * @dev Get user's bets
     */
    function getUserBets(address _user) external view returns (uint256[] memory) {
        return userBets[_user];
    }
    
    /**
     * @dev Get current odds for a market
     */
    function getMarketOdds(uint256 _marketId) external view returns (uint256 yesPercent, uint256 noPercent) {
        Market memory market = markets[_marketId];
        
        if (market.totalVolume == 0) {
            return (50, 50);
        }
        
        yesPercent = (market.yesPool * 100) / market.totalVolume;
        noPercent = (market.noPool * 100) / market.totalVolume;
    }
    
    /**
     * @dev Update platform fee (admin only)
     */
    function setPlatformFee(uint256 _feeBps) external onlyAdmin {
        require(_feeBps <= 1000, "Fee cannot exceed 10%");
        platformFeeBps = _feeBps;
    }
    
    /**
     * @dev Update admin address
     */
    function setAdmin(address _newAdmin) external onlyAdmin {
        admin = _newAdmin;
    }
    
    /**
     * @dev Withdraw platform fees - FIXED: Only withdraw accumulated fees, not all balance
     */
    function withdrawFees() external onlyAdmin nonReentrant {
        uint256 feesToWithdraw = accumulatedFees;
        require(feesToWithdraw > 0, "No fees to withdraw");
        
        // Update state BEFORE transfer
        accumulatedFees = 0;
        
        (bool success, ) = payable(platformFeeRecipient).call{value: feesToWithdraw}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Cancel a market before resolution (admin only, refunds all bets)
     * FIXED: Added reentrancy protection and proper state management
     */
    function cancelMarket(uint256 _marketId) external onlyAdmin nonReentrant {
        Market storage market = markets[_marketId];
        
        require(market.id != 0, "Market does not exist");
        require(!market.isResolved, "Cannot cancel resolved market");
        require(market.status == MarketStatus.ACTIVE, "Market not active");
        
        // Update state FIRST
        market.status = MarketStatus.CANCELLED;
        
        Bet[] storage bets = marketBets[_marketId];
        
        // Mark all bets as claimed FIRST
        for (uint256 i = 0; i < bets.length; i++) {
            if (!bets[i].claimed) {
                bets[i].claimed = true;
            }
        }
        
        // Then refund AFTER state updates
        for (uint256 i = 0; i < bets.length; i++) {
            if (bets[i].amount > 0) {
                (bool success, ) = payable(bets[i].user).call{value: bets[i].amount}("");
                require(success, "Refund failed");
            }
        }
    }
}
