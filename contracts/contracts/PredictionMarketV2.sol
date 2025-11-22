// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title PredictionMarketV2
 * @dev Supports betting with both BNB and $PRED token
 */
contract PredictionMarketV2 {
    
    enum Currency { BNB, PRED }
    
    struct Market {
        uint256 id;
        string title;
        string description;
        address creator;
        uint256 createdAt;
        uint256 resolutionTime;
        bool isResolved;
        bool outcome;
        uint256 yesPoolBnb;
        uint256 noPoolBnb;
        uint256 yesPoolPred;
        uint256 noPoolPred;
        uint256 totalVolumeBnb;
        uint256 totalVolumePred;
        MarketStatus status;
        uint256 resolutionSubmittedAt;
        bool autoPayoutTriggered;
        // Separate tracking for initial liquidity (protocol-owned, not user bets)
        uint256 initialLiquidityYesBnb;
        uint256 initialLiquidityNoBnb;
        uint256 initialLiquidityYesPred;
        uint256 initialLiquidityNoPred;
        // Oracle evidence hash for verifiable resolution
        string evidenceHash;
    }
    
    enum MarketStatus { ACTIVE, DISPUTED, RESOLVED, FINALIZED, CANCELLED }
    
    struct Bet {
        address user;
        uint256 marketId;
        uint256 amount;
        bool pick;
        Currency currency;
        uint256 timestamp;
        bool claimed;
    }
    
    IERC20 public predToken;
    uint256 public marketCounter;
    mapping(uint256 => Market) public markets;
    mapping(uint256 => Bet[]) public marketBets;
    mapping(address => uint256[]) public userBets;
    mapping(uint256 => mapping(address => bool)) public hasReceivedPayout;
    
    uint256 public platformFeeBps = 100;
    uint256 public accumulatedFeesBnb;
    uint256 public accumulatedFeesPred;
    uint256 public lockedFundsBnb; // Funds from zero-winner markets
    uint256 public lockedFundsPred; // Funds from zero-winner markets
    address public platformFeeRecipient;
    address public admin;
    
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private reentrancyStatus;
    
    event MarketCreated(uint256 indexed marketId, string title, address indexed creator, uint256 initialYesBnb, uint256 initialNoBnb, uint256 initialYesPred, uint256 initialNoPred);
    event BetPlaced(uint256 indexed marketId, address indexed user, uint256 amount, bool pick, Currency currency);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event MarketFinalized(uint256 indexed marketId, uint256 bnbToFees, uint256 predToFees, uint256 bnbLocked, uint256 predLocked);
    event AutoPayoutTriggered(uint256 indexed marketId);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount, Currency currency);
    event MarketDisputed(uint256 indexed marketId, address indexed disputor);
    event LockedFundsWithdrawn(uint256 bnbAmount, uint256 predAmount);
    
    constructor(address _predTokenAddress) {
        admin = msg.sender;
        platformFeeRecipient = msg.sender;
        reentrancyStatus = NOT_ENTERED;
        predToken = IERC20(_predTokenAddress);
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier nonReentrant() {
        require(reentrancyStatus != ENTERED, "Reentrancy");
        reentrancyStatus = ENTERED;
        _;
        reentrancyStatus = NOT_ENTERED;
    }
    
    function createMarket(
        string memory _title,
        string memory _description,
        uint256 _resolutionTime,
        uint256 _initialYesBnb,
        uint256 _initialNoBnb,
        uint256 _initialYesPred,
        uint256 _initialNoPred
    ) external payable returns (uint256) {
        require(_resolutionTime > block.timestamp, "Future time required");
        require(bytes(_title).length > 0, "Title required");
        
        uint256 totalBnb = _initialYesBnb + _initialNoBnb;
        uint256 totalPred = _initialYesPred + _initialNoPred;
        
        require(msg.value == totalBnb, "Incorrect BNB amount");
        
        if (totalPred > 0) {
            require(predToken.transferFrom(msg.sender, address(this), totalPred), "PRED transfer failed");
        }
        
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
            yesPoolBnb: _initialYesBnb,
            noPoolBnb: _initialNoBnb,
            yesPoolPred: _initialYesPred,
            noPoolPred: _initialNoPred,
            totalVolumeBnb: 0,  // Volume tracks only user bets, not initial liquidity
            totalVolumePred: 0,
            status: MarketStatus.ACTIVE,
            resolutionSubmittedAt: 0,
            autoPayoutTriggered: false,
            // Track initial liquidity separately (protocol-owned)
            initialLiquidityYesBnb: _initialYesBnb,
            initialLiquidityNoBnb: _initialNoBnb,
            initialLiquidityYesPred: _initialYesPred,
            initialLiquidityNoPred: _initialNoPred,
            evidenceHash: "" // No evidence hash at creation
        });
        
        // Record initial liquidity as bets owned by msg.sender (deployer/creator)
        // This ensures initial liquidity can be claimed if it wins
        if (_initialYesBnb > 0) {
            marketBets[marketCounter].push(Bet({
                user: msg.sender,
                marketId: marketCounter,
                amount: _initialYesBnb,
                pick: true,  // YES
                currency: Currency.BNB,
                timestamp: block.timestamp,
                claimed: false
            }));
        }
        if (_initialNoBnb > 0) {
            marketBets[marketCounter].push(Bet({
                user: msg.sender,
                marketId: marketCounter,
                amount: _initialNoBnb,
                pick: false,  // NO
                currency: Currency.BNB,
                timestamp: block.timestamp,
                claimed: false
            }));
        }
        if (_initialYesPred > 0) {
            marketBets[marketCounter].push(Bet({
                user: msg.sender,
                marketId: marketCounter,
                amount: _initialYesPred,
                pick: true,  // YES
                currency: Currency.PRED,
                timestamp: block.timestamp,
                claimed: false
            }));
        }
        if (_initialNoPred > 0) {
            marketBets[marketCounter].push(Bet({
                user: msg.sender,
                marketId: marketCounter,
                amount: _initialNoPred,
                pick: false,  // NO
                currency: Currency.PRED,
                timestamp: block.timestamp,
                claimed: false
            }));
        }
        
        emit MarketCreated(marketCounter, _title, msg.sender, _initialYesBnb, _initialNoBnb, _initialYesPred, _initialNoPred);
        return marketCounter;
    }
    
    function placeBet(uint256 _marketId, bool _pick, Currency _currency, uint256 _amount) external payable nonReentrant {
        Market storage market = markets[_marketId];
        
        require(market.id != 0, "Market not found");
        require(!market.isResolved, "Already resolved");
        require(market.status == MarketStatus.ACTIVE, "Not active");
        require(block.timestamp < market.resolutionTime, "Expired");
        
        if (_currency == Currency.BNB) {
            require(msg.value == _amount, "Incorrect BNB");
            require(_amount >= 0.001 ether, "Min 0.001 BNB");
            require(_amount <= 100 ether, "Max 100 BNB");
        } else {
            require(msg.value == 0, "No BNB for PRED bet");
            require(_amount >= 1 ether, "Min 1 PRED");
            require(_amount <= 100000 ether, "Max 100000 PRED");
            require(predToken.transferFrom(msg.sender, address(this), _amount), "PRED transfer failed");
        }
        
        marketBets[_marketId].push(Bet({
            user: msg.sender,
            marketId: _marketId,
            amount: _amount,
            pick: _pick,
            currency: _currency,
            timestamp: block.timestamp,
            claimed: false
        }));
        
        userBets[msg.sender].push(_marketId);
        
        if (_currency == Currency.BNB) {
            if (_pick) market.yesPoolBnb += _amount;
            else market.noPoolBnb += _amount;
            market.totalVolumeBnb += _amount;
        } else {
            if (_pick) market.yesPoolPred += _amount;
            else market.noPoolPred += _amount;
            market.totalVolumePred += _amount;
        }
        
        emit BetPlaced(_marketId, msg.sender, _amount, _pick, _currency);
    }
    
    function placeBatchBets(
        uint256[] memory _marketIds,
        bool[] memory _picks,
        uint256[] memory _amounts,
        Currency[] memory _currencies
    ) external payable nonReentrant {
        require(_marketIds.length > 0, "Empty batch");
        require(_marketIds.length == _picks.length, "Length mismatch");
        require(_marketIds.length == _amounts.length, "Length mismatch");
        require(_marketIds.length == _currencies.length, "Length mismatch");
        require(_marketIds.length <= 50, "Max 50 bets");
        
        uint256 totalBnbRequired = 0;
        uint256 totalPredRequired = 0;
        
        for (uint256 i = 0; i < _amounts.length; i++) {
            if (_currencies[i] == Currency.BNB) {
                require(_amounts[i] >= 0.001 ether, "Min 0.001 BNB");
                require(_amounts[i] <= 100 ether, "Max 100 BNB");
                totalBnbRequired += _amounts[i];
            } else {
                require(_amounts[i] >= 1 ether, "Min 1 PRED");
                require(_amounts[i] <= 100000 ether, "Max 100000 PRED");
                totalPredRequired += _amounts[i];
            }
        }
        
        require(msg.value == totalBnbRequired, "Incorrect BNB amount");
        
        if (totalPredRequired > 0) {
            require(predToken.transferFrom(msg.sender, address(this), totalPredRequired), "PRED transfer failed");
        }
        
        for (uint256 i = 0; i < _marketIds.length; i++) {
            uint256 marketId = _marketIds[i];
            Market storage market = markets[marketId];
            
            require(market.id != 0, "Market not found");
            require(!market.isResolved, "Already resolved");
            require(market.status == MarketStatus.ACTIVE, "Not active");
            require(block.timestamp < market.resolutionTime, "Expired");
            
            marketBets[marketId].push(Bet({
                user: msg.sender,
                marketId: marketId,
                amount: _amounts[i],
                pick: _picks[i],
                currency: _currencies[i],
                timestamp: block.timestamp,
                claimed: false
            }));
            
            userBets[msg.sender].push(marketId);
            
            if (_currencies[i] == Currency.BNB) {
                if (_picks[i]) market.yesPoolBnb += _amounts[i];
                else market.noPoolBnb += _amounts[i];
                market.totalVolumeBnb += _amounts[i];
            } else {
                if (_picks[i]) market.yesPoolPred += _amounts[i];
                else market.noPoolPred += _amounts[i];
                market.totalVolumePred += _amounts[i];
            }
            
            emit BetPlaced(marketId, msg.sender, _amounts[i], _picks[i], _currencies[i]);
        }
    }
    
    // Backwards-compatible wrapper (keeps old signature working)
    function resolveMarket(uint256 _marketId, bool _outcome) external onlyAdmin {
        resolveMarketWithEvidence(_marketId, _outcome, "");
    }
    
    // New version with evidence hash support
    function resolveMarketWithEvidence(uint256 _marketId, bool _outcome, string memory _evidenceHash) public onlyAdmin {
        Market storage market = markets[_marketId];
        require(market.id != 0, "Market not found");
        require(!market.isResolved, "Already resolved");
        
        market.isResolved = true;
        market.outcome = _outcome;
        market.status = MarketStatus.RESOLVED;
        market.resolutionSubmittedAt = block.timestamp;
        market.evidenceHash = _evidenceHash; // Store oracle evidence hash (IPFS/SHA-256)
        
        emit MarketResolved(_marketId, _outcome);
    }
    
    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.FINALIZED, "Not finalized");
        require(!hasReceivedPayout[_marketId][msg.sender], "Already claimed");
        
        (uint256 bnbPayout, uint256 predPayout) = calculateUserPayout(_marketId, msg.sender);
        require(bnbPayout > 0 || predPayout > 0, "No winnings");
        
        hasReceivedPayout[_marketId][msg.sender] = true;
        
        if (bnbPayout > 0) {
            (bool success, ) = msg.sender.call{value: bnbPayout}("");
            require(success, "BNB transfer failed");
            emit WinningsClaimed(_marketId, msg.sender, bnbPayout, Currency.BNB);
        }
        
        if (predPayout > 0) {
            require(predToken.transfer(msg.sender, predPayout), "PRED transfer failed");
            emit WinningsClaimed(_marketId, msg.sender, predPayout, Currency.PRED);
        }
    }
    
    function calculateUserPayout(uint256 _marketId, address _user) public view returns (uint256 bnbPayout, uint256 predPayout) {
        Market storage market = markets[_marketId];
        Bet[] storage bets = marketBets[_marketId];
        
        uint256 winningPoolBnb = market.outcome ? market.yesPoolBnb : market.noPoolBnb;
        uint256 losingPoolBnb = market.outcome ? market.noPoolBnb : market.yesPoolBnb;
        uint256 winningPoolPred = market.outcome ? market.yesPoolPred : market.noPoolPred;
        uint256 losingPoolPred = market.outcome ? market.noPoolPred : market.yesPoolPred;
        
        // Initial liquidity participates in payouts (acts like a "house bet")
        // This prevents division by zero and ensures fair distribution
        for (uint256 i = 0; i < bets.length; i++) {
            if (bets[i].user == _user && bets[i].pick == market.outcome) {
                if (bets[i].currency == Currency.BNB && winningPoolBnb > 0) {
                    uint256 fee = (bets[i].amount * platformFeeBps) / 10000;
                    // Payout = stake (minus fee) + proportional share of losing pool (including initial liquidity)
                    uint256 shareOfLosingPool = (bets[i].amount * losingPoolBnb) / winningPoolBnb;
                    bnbPayout += (bets[i].amount - fee + shareOfLosingPool);
                } else if (bets[i].currency == Currency.PRED && winningPoolPred > 0) {
                    uint256 fee = (bets[i].amount * platformFeeBps) / 10000;
                    // Payout = stake (minus fee) + proportional share of losing pool
                    uint256 shareOfLosingPool = (bets[i].amount * losingPoolPred) / winningPoolPred;
                    predPayout += (bets[i].amount - fee + shareOfLosingPool);
                }
            }
        }
    }
    
    function finalizeMarket(uint256 _marketId) external onlyAdmin {
        Market storage market = markets[_marketId];
        require(market.status == MarketStatus.RESOLVED, "Not resolved");
        require(block.timestamp >= market.resolutionSubmittedAt + 30 minutes, "Dispute window active");
        
        market.status = MarketStatus.FINALIZED;
        
        uint256 winningPoolBnb = market.outcome ? market.yesPoolBnb : market.noPoolBnb;
        uint256 losingPoolBnb = market.outcome ? market.noPoolBnb : market.yesPoolBnb;
        uint256 winningPoolPred = market.outcome ? market.yesPoolPred : market.noPoolPred;
        uint256 losingPoolPred = market.outcome ? market.noPoolPred : market.yesPoolPred;
        
        uint256 feeBnb = 0;
        uint256 predFee = 0;
        uint256 bnbLocked = 0;
        uint256 predLocked = 0;
        
        // Handle BNB: Initial liquidity participates in payouts (treated as house bet)
        // If no winners at all (including initial liquidity), lock losing pool
        if (winningPoolBnb == 0 && losingPoolBnb > 0) {
            // Zero winners: lock all losing funds for admin withdrawal
            bnbLocked = losingPoolBnb;
            lockedFundsBnb += bnbLocked;
        } else if (winningPoolBnb > 0) {
            // Normal case: collect fees from winning pool (includes initial liquidity)
            feeBnb = (winningPoolBnb * platformFeeBps) / 10000;
            accumulatedFeesBnb += feeBnb;
        }
        
        // Handle PRED: same logic
        if (winningPoolPred == 0 && losingPoolPred > 0) {
            predLocked = losingPoolPred;
            lockedFundsPred += predLocked;
        } else if (winningPoolPred > 0) {
            predFee = (winningPoolPred * platformFeeBps) / 10000;
            accumulatedFeesPred += predFee;
        }
        
        emit MarketFinalized(_marketId, feeBnb, predFee, bnbLocked, predLocked);
    }
    
    function withdrawFees() external onlyAdmin {
        uint256 bnbFees = accumulatedFeesBnb;
        uint256 predFees = accumulatedFeesPred;
        
        accumulatedFeesBnb = 0;
        accumulatedFeesPred = 0;
        
        if (bnbFees > 0) {
            (bool success, ) = platformFeeRecipient.call{value: bnbFees}("");
            require(success, "BNB fee transfer failed");
        }
        
        if (predFees > 0) {
            require(predToken.transfer(platformFeeRecipient, predFees), "PRED fee transfer failed");
        }
    }
    
    /**
     * @dev Withdraw locked funds from zero-winner markets
     * These are funds where nobody bet on the winning side
     */
    function withdrawLockedFunds() external onlyAdmin nonReentrant {
        uint256 bnbLocked = lockedFundsBnb;
        uint256 predLocked = lockedFundsPred;
        
        lockedFundsBnb = 0;
        lockedFundsPred = 0;
        
        if (bnbLocked > 0) {
            (bool success, ) = platformFeeRecipient.call{value: bnbLocked}("");
            require(success, "BNB locked funds transfer failed");
        }
        
        if (predLocked > 0) {
            require(predToken.transfer(platformFeeRecipient, predLocked), "PRED locked funds transfer failed");
        }
        
        emit LockedFundsWithdrawn(bnbLocked, predLocked);
    }
    
    /**
     * @dev Get contract balances for accounting verification
     */
    function getContractBalances() external view returns (
        uint256 bnbBalance,
        uint256 predBalance,
        uint256 bnbAccountedFor,
        uint256 predAccountedFor
    ) {
        bnbBalance = address(this).balance;
        predBalance = predToken.balanceOf(address(this));
        
        // All BNB should be: fees + locked funds + active market pools
        bnbAccountedFor = accumulatedFeesBnb + lockedFundsBnb;
        predAccountedFor = accumulatedFeesPred + lockedFundsPred;
        
        // Note: Active market pools are tracked separately in market.yesPool*/market.noPool*
    }
}
