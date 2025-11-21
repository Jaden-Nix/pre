// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PredictionMarket
 * @dev On-chain prediction market contract for Predora
 * Deployed on BSC Testnet for real betting with testnet BNB/BUSD
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
    
    // Platform fee (1% = 100 basis points)
    uint256 public platformFeeBps = 100;
    address public platformFeeRecipient;
    address public admin;
    
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
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
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
     * @dev Place a bet on a market
     */
    function placeBet(uint256 _marketId, bool _pick) external payable {
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
        
        // Update pools
        if (_pick) {
            market.yesPool += msg.value;
        } else {
            market.noPool += msg.value;
        }
        market.totalVolume += msg.value;
        
        emit BetPlaced(_marketId, msg.sender, msg.value, _pick);
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
    function autoFinalizeAndPayout(uint256 _marketId) external {
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
     * @dev Batch payout for large markets (>100 bets)
     * Processes winners in chunks to avoid gas limit issues
     */
    function batchDistributeWinnings(uint256 _marketId, uint256 startIdx, uint256 endIdx) external {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.FINALIZED, "Market must be finalized first");
        
        Bet[] storage bets = marketBets[_marketId];
        require(endIdx <= bets.length, "Index out of bounds");
        require(startIdx < endIdx, "Invalid range");
        
        uint256 winningPool = market.outcome ? market.yesPool : market.noPool;
        uint256 losingPool = market.outcome ? market.noPool : market.yesPool;
        uint256 platformFee = (losingPool * platformFeeBps) / 10000;
        uint256 payoutPool = market.totalVolume - platformFee;
        
        for (uint256 i = startIdx; i < endIdx; i++) {
            if (bets[i].pick == market.outcome && !bets[i].claimed && !hasReceivedPayout[_marketId][bets[i].user]) {
                uint256 payout = (bets[i].amount * payoutPool) / winningPool;
                bets[i].claimed = true;
                hasReceivedPayout[_marketId][bets[i].user] = true;
                
                (bool success, ) = payable(bets[i].user).call{value: payout}("");
                require(success, "Payout failed");
                
                emit WinningsClaimed(_marketId, bets[i].user, payout);
            }
        }
    }

    /**
     * @dev Internal: Distribute winnings to all winners
     */
    function _distributeWinnings(uint256 _marketId) internal {
        Market storage market = markets[_marketId];
        Bet[] storage bets = marketBets[_marketId];
        
        uint256 winningPool = market.outcome ? market.yesPool : market.noPool;
        uint256 losingPool = market.outcome ? market.noPool : market.yesPool;
        uint256 platformFee = (losingPool * platformFeeBps) / 10000;
        uint256 payoutPool = market.totalVolume - platformFee;
        
        // Transfer platform fee to recipient
        if (platformFee > 0) {
            (bool feeSuccess, ) = payable(platformFeeRecipient).call{value: platformFee}("");
            require(feeSuccess, "Platform fee transfer failed");
        }
        
        // Prevent division by zero
        if (winningPool == 0) {
            return;
        }
        
        // Distribute to all winners, tracking to avoid duplicate payouts
        for (uint256 i = 0; i < bets.length; i++) {
            if (bets[i].pick == market.outcome && !bets[i].claimed && !hasReceivedPayout[_marketId][bets[i].user]) {
                uint256 payout = (bets[i].amount * payoutPool) / winningPool;
                bets[i].claimed = true;
                hasReceivedPayout[_marketId][bets[i].user] = true;
                
                (bool success, ) = payable(bets[i].user).call{value: payout}("");
                require(success, "Payout failed");
                
                emit WinningsClaimed(_marketId, bets[i].user, payout);
            }
        }
    }
    
    /**
     * @dev Claim winnings for a resolved market
     */
    function claimWinnings(uint256 _marketId) external {
        Market storage market = markets[_marketId];
        
        require(market.isResolved, "Market is not resolved");
        require(market.status == MarketStatus.RESOLVED, "Market status invalid");
        
        Bet[] storage bets = marketBets[_marketId];
        uint256 totalPayout = 0;
        
        // Find all winning bets by this user
        for (uint256 i = 0; i < bets.length; i++) {
            if (bets[i].user == msg.sender && !bets[i].claimed && bets[i].pick == market.outcome) {
                // Calculate payout
                uint256 winningPool = market.outcome ? market.yesPool : market.noPool;
                uint256 losingPool = market.outcome ? market.noPool : market.yesPool;
                
                // Payout = (bet amount / winning pool) * (total pool - fees)
                uint256 platformFee = (losingPool * platformFeeBps) / 10000;
                uint256 payoutPool = market.totalVolume - platformFee;
                uint256 payout = (bets[i].amount * payoutPool) / winningPool;
                
                totalPayout += payout;
                bets[i].claimed = true;
            }
        }
        
        require(totalPayout > 0, "No winnings to claim");
        
        // Transfer winnings
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
     * @dev Withdraw platform fees
     */
    function withdrawFees() external onlyAdmin {
        (bool success, ) = payable(platformFeeRecipient).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Cancel a market before resolution (admin only, refunds all bets)
     */
    function cancelMarket(uint256 _marketId) external onlyAdmin {
        Market storage market = markets[_marketId];
        
        require(market.id != 0, "Market does not exist");
        require(!market.isResolved, "Cannot cancel resolved market");
        
        market.status = MarketStatus.CANCELLED;
        
        // Refund all bets
        Bet[] storage bets = marketBets[_marketId];
        for (uint256 i = 0; i < bets.length; i++) {
            if (!bets[i].claimed) {
                (bool success, ) = payable(bets[i].user).call{value: bets[i].amount}("");
                require(success, "Refund failed");
                bets[i].claimed = true;
            }
        }
    }
}
