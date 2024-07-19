var { VOID_ETHEREUM_ADDRESS, abi, VOID_BYTES32, blockchainCall, sendBlockchainTransaction, numberToString, compile, sendAsync, deployContract, abi, MAX_UINT256, web3Utils, fromDecimals, toDecimals } = global.multiverse = require('@ethereansos/multiverse');

var fs = require('fs');
var path = require('path');

var additionalData = { from : web3.currentProvider.knowledgeBase.from };

module.exports = async function start() {

    var OrgSpecialComponent = await compile(fs.readFileSync(path.resolve(__dirname, '../organizationWithSpecialComponent/OrgSpecialComponent.sol'), 'UTF-8'), 'OrgSpecialComponent');
    var treasuryComponent = new web3.eth.Contract(OrgSpecialComponent.abi, web3.currentProvider.knowledgeBase.KAI_DAO_TREASURY_ADDRESS);

    var organizationAddress = await blockchainCall(treasuryComponent.methods.host);

    var IOrganization = await compile(fs.readFileSync(path.resolve(__dirname, '../organizationWithSpecialComponent/IOrganization.sol'), 'UTF-8'), 'IOrganization');
    var organization = new web3.eth.Contract(IOrganization.abi, organizationAddress);
    var orgSpecialComponentAddress = await blockchainCall(organization.methods.get, web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_KAITEN_SPECIAL_COMPONENT);

    var orgSpecialComponent = new web3.eth.Contract(OrgSpecialComponent.abi, orgSpecialComponentAddress);

    var data = web3Utils.sha3('setUri(string)').substring(0, 10);
    var uri = 'ipfs://QmUxP93TY5dStAQNh2HzcXGXr1dRdyT5ry3Kj8oBd1rg3S';
    var payload = abi.encode(["string"], [uri]).substring(2);
    data += payload;

    await blockchainCall(orgSpecialComponent.methods.submit, organization.options.address, data, web3.currentProvider.knowledgeBase.fromAddress, additionalData);
}
