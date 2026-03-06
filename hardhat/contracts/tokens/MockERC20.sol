// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
  uint8 private _tokenDecimals;

  constructor(
    string memory name_,
    string memory symbol_,
    uint256 initialSupply,
    uint8 decimals_,
    address initialOwner
  ) ERC20(name_, symbol_) Ownable(initialOwner) {
    _tokenDecimals = decimals_;
    _mint(initialOwner, initialSupply * (10 ** decimals_));
  }

  function decimals() public view override returns (uint8) {
    return _tokenDecimals;
  }
}

