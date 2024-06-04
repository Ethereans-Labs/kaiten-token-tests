var { VOID_ETHEREUM_ADDRESS, abi, VOID_BYTES32, blockchainCall, sendBlockchainTransaction, numberToString, compile, sendAsync, deployContract, abi, MAX_UINT256, web3Utils, fromDecimals, toDecimals } = global.multiverse = require('@ethereansos/multiverse');

var fs = require('fs');
var path = require('path');

var additionalData = { from : web3.currentProvider.knowledgeBase.from };

async function dumpAdditionalFunctionsStatus(token, filledOnly) {
    var args = {
        address : token.options.address,
        topics : [
            web3Utils.sha3("FunctionManager(bytes4,address,address,string)")
        ],
        fromBlock : '0x0',
        toBlock : 'latest'
    };
    var logs = await web3.eth.getPastLogs(args);
    logs = logs.map(it => abi.decode(["string"], it.data)[0]).filter((it, i, arr) => arr.indexOf(it) === i);
    var addresses = await token.methods.functionsManagers(logs).call();
    logs = logs.reduce((acc, it, i) => ({...acc, [it] : addresses[i]}), {});
    logs = !filledOnly ? logs : Object.entries(logs).filter(it => it[1] !== VOID_ETHEREUM_ADDRESS).reduce((acc, it) => ({...acc, [it[0]] : it[1]}), {});
    console.log(logs);
}

module.exports = async function start() {

    var Token = await compile('@ethereans-labs/kaiten-token/contracts/vert/Token');
    var token = new web3.eth.Contract(Token.abi, web3.currentProvider.knowledgeBase.KAI_TOKEN_ADDRESS);

    var TreasuryBootstrap = await compile('@ethereans-labs/kaiten-token/contracts/vert/TreasuryBootstrap');
    var treasuryBootstrap = new web3.eth.Contract(TreasuryBootstrap.abi, web3.currentProvider.knowledgeBase.KAI_TOKEN_ADDRESS);

    await dumpAdditionalFunctionsStatus(token);

    await changeNameAndSymbol(treasuryBootstrap, token);

    await dumpAdditionalFunctionsStatus(token);
}

async function changeNameAndSymbol(treasuryBootstrap, token) {
    console.log({
        name : await token.methods.name().call(),
        symbol : await token.methods.symbol().call(),
        decimals : await token.methods.decimals().call()
    });

    var code = path.resolve(__dirname, 'NameAndSymbol.sol');
    code = fs.readFileSync(code, 'UTF-8');
    var NameAndSymbol = await compile(code, 'NameAndSymbol');
    var nameAndSymbol = await deployContract(new web3.eth.Contract(NameAndSymbol.abi), NameAndSymbol.bin, [], additionalData);
    global.accounts && await assert.catchCall(blockchainCall(treasuryBootstrap.methods.setFinalNameAndSymbol, nameAndSymbol.options.address), "unauthorized");
    await blockchainCall(treasuryBootstrap.methods.setFinalNameAndSymbol, nameAndSymbol.options.address, additionalData);
    global.accounts && await assert.catchCall(blockchainCall(treasuryBootstrap.methods.setFinalNameAndSymbol, nameAndSymbol.options.address, additionalData));

    console.log({
        name : await token.methods.name().call(),
        symbol : await token.methods.symbol().call(),
        decimals : await token.methods.decimals().call()
    });
}