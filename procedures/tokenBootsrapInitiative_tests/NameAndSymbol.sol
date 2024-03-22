// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract NameAndSymbol {
    function name() external pure returns (string memory) {
        return "NewName";
    }

    function symbol() external pure returns (string memory) {
        return "SYMB";
    }
}