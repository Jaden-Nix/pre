require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: process.env.DEPLOY_PRIVATE_KEY ? [process.env.DEPLOY_PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY
  }
};
