// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";

contract SenzaWalletHelper {
  error InvalidToken();
  error UnsupportedToken();

  event FavoriteTokenUpdated(address indexed user, address indexed token, bool isFavorite);

  mapping(address user => mapping(address token => bool isFavorite)) public favorites;

  modifier validToken(address token) {
    if (token == address(0)) revert InvalidToken();
    _;
  }

  function isConfidentialToken(address token) public view returns (bool) {
    if (token == address(0) || token.code.length == 0) {
      return false;
    }

    try IERC165(token).supportsInterface(type(IERC7984).interfaceId) returns (bool supported) {
      return supported;
    } catch {
      return false;
    }
  }

  function setFavoriteToken(address token, bool isFavorite) external validToken(token) {
    if (!isConfidentialToken(token)) revert UnsupportedToken();
    favorites[msg.sender][token] = isFavorite;
    emit FavoriteTokenUpdated(msg.sender, token, isFavorite);
  }
}
