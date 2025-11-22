// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PredToken ($PRED)
 * @dev Simple ERC20 token for Predora prediction market
 * Initial supply: 1,000,000 PRED tokens
 * Decimals: 18 (standard)
 */
contract PredToken {
    string public constant name = "Predora Token";
    string public constant symbol = "PRED";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public owner;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    
    constructor(uint256 _initialSupply) {
        owner = msg.sender;
        totalSupply = _initialSupply * 10**uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        require(_to != address(0), "Invalid address");
        
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
    
    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Allowance exceeded");
        require(_to != address(0), "Invalid address");
        
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        
        emit Transfer(_from, _to, _value);
        return true;
    }
    
    /**
     * @dev Mint new tokens (only owner can call)
     * Useful for airdrops or rewarding users
     */
    function mint(address _to, uint256 _amount) public onlyOwner returns (bool) {
        require(_to != address(0), "Invalid address");
        
        uint256 amount = _amount * 10**uint256(decimals);
        totalSupply += amount;
        balanceOf[_to] += amount;
        
        emit Mint(_to, amount);
        emit Transfer(address(0), _to, amount);
        return true;
    }
    
    /**
     * @dev Airdrop tokens to multiple addresses
     */
    function airdrop(address[] memory _recipients, uint256 _amountEach) public onlyOwner {
        uint256 amount = _amountEach * 10**uint256(decimals);
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Invalid address in list");
            balanceOf[_recipients[i]] += amount;
            totalSupply += amount;
            emit Mint(_recipients[i], amount);
            emit Transfer(address(0), _recipients[i], amount);
        }
    }
}
