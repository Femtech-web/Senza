// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {
  ERC7984,
  ERC7984ERC20Wrapper
} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialUSDT is ERC7984ERC20Wrapper, ZamaEthereumConfig {
  constructor(IERC20 usdt)
    ERC7984ERC20Wrapper(usdt)
    ERC7984("Confidential USDT", "cUSDT", "ipfs://QmSenzaConfidentialUSDTMetadata")
  {}

  function underlyingToken() external view returns (address) {
    return address(underlying());
  }
}

