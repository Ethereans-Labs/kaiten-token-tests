// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0;

import "@ethereansos/swissknife/contracts/generic/impl/LazyInitCapableElement.sol";
import { ReflectionUtilities } from "@ethereansos/swissknife/contracts/lib/GeneralUtilities.sol";

contract OrgSpecialComponent is LazyInitCapableElement {
    using ReflectionUtilities for address;

    address public owner;

    constructor(bytes memory lazyInitData) LazyInitCapableElement(lazyInitData) {
    }

    function _lazyInit(bytes memory lazyInitData) internal override returns (bytes memory) {
        owner = abi.decode(lazyInitData, (address));
        return "";
    }

    function _supportsInterface(bytes4 interfaceId) internal override pure returns(bool) {
    }

    modifier onlyOwner {
        require(msg.sender == owner, "unauthorized");
        _;
    }

    function setOwner(address newValue) external onlyOwner returns(address oldValue) {
        oldValue = owner;
        owner = newValue;
    }

    function submit(address location, bytes calldata payload, address restReceiver) onlyOwner external payable returns(bytes memory response) {
        uint256 oldBalance = address(this).balance - msg.value;
        response = location.submit(msg.value, payload);
        uint256 actualBalance = address(this).balance;
        if(actualBalance > oldBalance) {
            (restReceiver != address(0) ? restReceiver : msg.sender).submit(address(this).balance - oldBalance, "");
        }
    }
}