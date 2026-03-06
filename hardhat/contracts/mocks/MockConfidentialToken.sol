// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

contract MockConfidentialToken {
  function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
    return interfaceId == type(IERC165).interfaceId || interfaceId == type(IERC7984).interfaceId;
  }
}
