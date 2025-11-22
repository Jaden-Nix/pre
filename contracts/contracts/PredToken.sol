// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PredToken
 * @dev $PRED token for Predora prediction markets
 * Platform token valued at $600 each for betting and rewards
 */
contract PredToken is ERC20, Ownable {
    // Token decimals
    uint8 private constant DECIMALS = 18;
    
    // Initial supply: 1 billion tokens
    uint256 private constant INITIAL_SUPPLY = 1_000_000_000 * 10**DECIMALS;
    
    // Faucet settings
    uint256 public faucetAmount = 50 * 10**DECIMALS; // 50 $PRED per claim
    uint256 public faucetCooldown = 24 hours;
    mapping(address => uint256) public lastFaucetClaim;
    
    constructor() ERC20("Predora Token", "PRED") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Allows users to claim free tokens from faucet
     */
    function claimFromFaucet() external {
        require(
            block.timestamp >= lastFaucetClaim[msg.sender] + faucetCooldown,
            "Faucet cooldown not expired"
        );
        
        lastFaucetClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);
        
        emit FaucetClaimed(msg.sender, faucetAmount);
    }
    
    /**
     * @dev Admin can update faucet amount
     */
    function setFaucetAmount(uint256 _amount) external onlyOwner {
        faucetAmount = _amount;
    }
    
    /**
     * @dev Admin can update faucet cooldown
     */
    function setFaucetCooldown(uint256 _cooldown) external onlyOwner {
        faucetCooldown = _cooldown;
    }
    
    /**
     * @dev Admin can mint tokens
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Check if user can claim from faucet
     */
    function canClaimFaucet(address user) external view returns (bool) {
        return block.timestamp >= lastFaucetClaim[user] + faucetCooldown;
    }
    
    /**
     * @dev Get time until next faucet claim
     */
    function timeUntilNextClaim(address user) external view returns (uint256) {
        uint256 nextClaimTime = lastFaucetClaim[user] + faucetCooldown;
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        return nextClaimTime - block.timestamp;
    }
    
    event FaucetClaimed(address indexed user, uint256 amount);
}
