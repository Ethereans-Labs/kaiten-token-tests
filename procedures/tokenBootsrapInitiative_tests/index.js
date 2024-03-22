var { VOID_ETHEREUM_ADDRESS, abi, VOID_BYTES32, blockchainCall, sendBlockchainTransaction, numberToString, compile, sendAsync, deployContract, abi, MAX_UINT256, web3Utils, fromDecimals, toDecimals } = global.multiverse = require('@ethereansos/multiverse');
Object.entries(global.multiverse).forEach(it => global[it[0]] = it[1]);

var fs = require('fs');
var path = require('path');

var additionalData = {from : web3.currentProvider.knowledgeBase.from};

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

async function swap(token, amount, swapToken) {
    var UniswapV3SwapRouter = await compile('@ethereans-labs/kaiten-token/contracts/vert/uniswapV3/ISwapRouter');
    var uniswapV3SwapRouter = new web3.eth.Contract(UniswapV3SwapRouter.abi, web3.currentProvider.knowledgeBase.UNISWAP_V3_SWAP_ROUTER);

    amount = amount || "1000000000000000000";

    var WETH = web3Utils.toChecksumAddress(await uniswapV3SwapRouter.methods.WETH9().call());

    var path = WETH + '002710' + web3Utils.toChecksumAddress(token.options.address).substring(2);
    if(swapToken) {
        path = web3Utils.toChecksumAddress(token.options.address) + '002710' + WETH.substring(2);
        await blockchainCall(token.methods.approve, uniswapV3SwapRouter.options.address, amount, { from : accounts[5]});
    }

    var swapParams = {
        path,
        recipient : accounts[0],
        deadline : new Date().getTime(),
        amountIn : amount,
        amountOutMinimum : 0
    };

    await blockchainCall(uniswapV3SwapRouter.methods.exactInput, swapParams, { from : accounts[5], value : swapToken ? '0' : amount});
}

async function exactOutput(token) {
    var UniswapV3SwapRouter = await compile('@ethereans-labs/kaiten-token/contracts/vert/uniswapV3/ISwapRouter');
    var uniswapV3SwapRouter = new web3.eth.Contract(UniswapV3SwapRouter.abi, web3.currentProvider.knowledgeBase.UNISWAP_V3_SWAP_ROUTER);

    var WETH = web3Utils.toChecksumAddress(await uniswapV3SwapRouter.methods.WETH9().call());

    var path = WETH + '002710' + web3Utils.toChecksumAddress(token.options.address).substring(2);
    path = web3Utils.toChecksumAddress(token.options.address) + '002710' + WETH.substring(2);

    var amount = "1000000000000000000"

    var swapParams = {
        path,
        recipient : accounts[0],
        deadline : new Date().getTime(),
        amountOut : amount,
        amountInMaximum : amount
    };

    await blockchainCall(uniswapV3SwapRouter.methods.exactOutput, swapParams, { from : accounts[5], value : amount});
}

module.exports = async function start() {

    wellknownAddresses[web3.currentProvider.knowledgeBase.revenueShareDestination] = "Revenue Share Destination";
    wellknownAddresses[web3.currentProvider.knowledgeBase.marketingDestination] = "Marketing";
    wellknownAddresses[web3.currentProvider.knowledgeBase.projectBootstrapDestination] = "Project Bootstrap";
    wellknownAddresses[web3.currentProvider.knowledgeBase.revenueShareFeesInTokenCollector] = "Token Fees collector";

    var vestingContract = await require('../tokenBootsrapInitiative')(true);

    await web3.currentProvider.api.evm_setAccountBalance(web3.currentProvider.knowledgeBase.fromAddress, web3Utils.toHex(toDecimals(9999999999, 18)));

    var TreasuryBootstrapRevenueShare = await compile('@ethereans-labs/kaiten-token/contracts/vert/TreasuryBootstrapRevenueShare', undefined, undefined, true);
    var treasuryBootstrapRevenueShare = new web3.eth.Contract(TreasuryBootstrapRevenueShare.abi, web3.currentProvider.knowledgeBase.KAI_TREASURY_BOOTSTRAP_REVENUE_SHARE_ADDRESS);

    var Token = await compile('@ethereans-labs/kaiten-token/contracts/vert/Token');
    var token = new web3.eth.Contract(Token.abi, web3.currentProvider.knowledgeBase.KAI_TOKEN_ADDRESS);
    var tokenAddress = token.options.address;

    var TreasuryBootstrap = await compile('@ethereans-labs/kaiten-token/contracts/vert/TreasuryBootstrap');
    global.treasuryBootstrap = new web3.eth.Contract(TreasuryBootstrap.abi, web3.currentProvider.knowledgeBase.KAI_TOKEN_ADDRESS);

    await dumpAdditionalFunctionsStatus(token);

    var treasuryAddress = web3.currentProvider.knowledgeBase.KAI_DAO_TREASURY_ADDRESS;
    wellknownAddresses[web3.currentProvider.knowledgeBase.KAI_DAO_TREASURY_ADDRESS] = "DAO Treasury";

    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.completeInitialization, treasuryAddress, [vestingContract.address, web3.currentProvider.knowledgeBase.marketingDestination], [vestingContract.amount, toDecimals(11000000, 18)], additionalData));
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.completeInitialization, treasuryAddress, [vestingContract.address, web3.currentProvider.knowledgeBase.marketingDestination], [vestingContract.amount, toDecimals(11000000, 18)]));

    await assert.catchCall(swap(token));

    /*console.log({
        address : tokenAddress,
        name : await token.methods.name().call(),
        symbol : await token.methods.symbol().call(),
        decimals : await token.methods.decimals().call(),
        totalSupply : fromDecimals(await token.methods.totalSupply().call(), 18),
        balanceOfOwner : fromDecimals(await token.methods.balanceOf(web3.currentProvider.knowledgeBase.fromAddress).call(), 18),
        balanceOfSelf : fromDecimals(await token.methods.balanceOf(tokenAddress).call(), 18)
    });

    await blockchainCall(treasuryBootstrap.methods.firstDistribution, [web3.currentProvider.knowledgeBase.from], ["100000000000000000000000000"], false, additionalData);

    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.firstDistribution, [web3.currentProvider.knowledgeBase.from], ["100000000000000000000000000"], false), "unauthorized");

    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.firstDistribution, [web3.currentProvider.knowledgeBase.from], ["100000000000000000000000000"], false, additionalData), "math");

    await blockchainCall(treasuryBootstrap.methods.firstDistribution, [], [], false, additionalData);

    await blockchainCall(treasuryBootstrap.methods.firstDistribution, [], [], true, additionalData);

    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.firstDistribution, [web3.currentProvider.knowledgeBase.from], ["100000000000000000000000000"], false, additionalData), "");

    console.log({
        totalSupply : fromDecimals(await token.methods.totalSupply().call(), 18),
        balanceOfOwner : fromDecimals(await token.methods.balanceOf(web3.currentProvider.knowledgeBase.fromAddress).call(), 18),
        balanceOfSelf : fromDecimals(await token.methods.balanceOf(tokenAddress).call(), 18)
    });

    await blockchainCall(treasuryBootstrap.methods._storage);

    await blockchainCall(treasuryBootstrap.methods._storage);

    console.log("Storage", await treasuryBootstrap.methods._storage().call());

    await dumpAdditionalFunctionsStatus(token);
    await dumpAdditionalFunctionsStatus(token, true);*/

    //await attachProtocolAddress(accounts[10]);

    await changeNameAndSymbol(treasuryBootstrap, token);

    await web3.eth.sendTransaction({
        from : accounts[0],
        to : tokenAddress,
        value : '35450000000000000000',
        gas : '9000000'
    });
    var storage;
    console.log("Storage", storage = await treasuryBootstrap.methods._storage().call());
    console.log("Storage", await treasuryBootstrapRevenueShare.methods.positionOf(accounts[0]).call());

    console.log("BALANCE:", await token.methods.balanceOf(token.options.address).call());
    await assert.catchCall(blockchainCall(token.methods.transfer, accounts[5], "10000000000000000000000", {from : web3.currentProvider.knowledgeBase.marketingDestination}), "Transfers locked");

    await blockchainCall(treasuryBootstrapRevenueShare.methods.redeemVestingResult);

    await assert.catchCall(blockchainCall(treasuryBootstrapRevenueShare.methods.redeemVestingResult), "unknown account");

    await blockchainCall(treasuryBootstrap.methods.tryFinalizeBootstrapAndEnableAntiWhaleSystem);

    await web3.eth.sendTransaction({
        from : accounts[0],
        to : tokenAddress,
        value : '350000000000000',
        gas : '6000000'
    });

    await web3.eth.sendTransaction({
        from : accounts[1],
        to : tokenAddress,
        value : '350000000000000',
        gas : '6000000'
    });

    await web3.eth.sendTransaction({
        from : accounts[2],
        to : tokenAddress,
        value : '350000000000000',
        gas : '6000000'
    });

    await web3.eth.sendTransaction({
        from : accounts[6],
        to : tokenAddress,
        value : '35000000000000000000',
        gas : '6000000'
    });

    await assert.catchCall(swap(token), "TF");

    await web3.currentProvider.setNextBlockTime(parseInt(storage.bootstrapEnds) + 60);

    await blockchainCall(treasuryBootstrap.methods.tryFinalizeBootstrapAndEnableAntiWhaleSystem);

    await assert.catchCall(web3.eth.sendTransaction({
        from : accounts[0],
        to : tokenAddress,
        value : '350000000000000',
        gas : '6000000'
    }));
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.tryFinalizeBootstrapAndEnableAntiWhaleSystem));

    await blockchainCall(token.methods.transfer, accounts[5], "1000000000000000000000", {from : web3.currentProvider.knowledgeBase.marketingDestination});//1000
    await blockchainCall(token.methods.transfer, accounts[5], "10000000000000000000000", {from : web3.currentProvider.knowledgeBase.marketingDestination});//10000
    await assert.catchCall(blockchainCall(token.methods.transfer, accounts[5], "750000000000000000000001", {from : web3.currentProvider.knowledgeBase.marketingDestination}), "Anti-whale system active");
    await blockchainCall(token.methods.transfer, accounts[5], "750000000000000000000000", {from : web3.currentProvider.knowledgeBase.marketingDestination});//749000
    await assert.catchCall(blockchainCall(token.methods.transfer, accounts[5], "750000000000000000000000", {from : web3.currentProvider.knowledgeBase.marketingDestination}), "Anti-whale system active");

    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.tryDisableAntiWhaleSystem));
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.disableAntiWhaleSystem), "unauthorized");

    await blockchainCall(treasuryBootstrapRevenueShare.methods.redeemVestingResult, {from : accounts[1]});
    await assert.catchCall(blockchainCall(treasuryBootstrapRevenueShare.methods.redeemVestingResult, {from : accounts[1]}), "unknown account");

    var snapshotId = await web3.currentProvider.api.evm_snapshot();

    await blockchainCall(treasuryBootstrap.methods.disableAntiWhaleSystem, additionalData);

    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.tryDisableAntiWhaleSystem));
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.disableAntiWhaleSystem));
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.disableAntiWhaleSystem, additionalData));

    await web3.currentProvider.api.evm_revert(snapshotId);

    storage = await treasuryBootstrap.methods._storage().call();
    await web3.currentProvider.setNextBlockTime(parseInt(storage.antiWhaleSystemEnds) + 60);

    snapshotId = await web3.currentProvider.api.evm_snapshot();

    await blockchainCall(treasuryBootstrap.methods.tryDisableAntiWhaleSystem);
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.tryDisableAntiWhaleSystem));
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.disableAntiWhaleSystem));
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.disableAntiWhaleSystem, additionalData));

    await web3.currentProvider.api.evm_revert(snapshotId);

    await blockchainCall(treasuryBootstrapRevenueShare.methods.redeemVestingResult, {from : accounts[2]});
    await assert.catchCall(blockchainCall(treasuryBootstrapRevenueShare.methods.redeemVestingResult, {from : accounts[2]}), "unknown account");

    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.disableAntiWhaleSystem));
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.disableAntiWhaleSystem, additionalData));

    var nextRebalanceEvent = await treasuryBootstrapRevenueShare.methods.nextRebalanceEvent().call();
    await exactOutput(token);
    await swap(token, "30000000000000000000");
    await blockchainCall(treasuryBootstrapRevenueShare.methods.collectFees, abi.encode(["uint24", "uint256"], [0, 0]));
    await web3.currentProvider.setNextBlockTime(parseInt(nextRebalanceEvent) + 10);
    await blockchainCall(treasuryBootstrapRevenueShare.methods.claimReward, [accounts[6], accounts[7], accounts[8]], [toDecimals(0.3, 18), toDecimals(0.05, 18)], {from : accounts[10]});

    for(var i = 0; i < 6; i++) {
        await swap(token, "30000000000000000000");
        await blockchainCall(treasuryBootstrapRevenueShare.methods.collectFees, abi.encode(["uint24", "uint256"], [0, 0]));
        var nextRebalanceEvent = await treasuryBootstrapRevenueShare.methods.nextRebalanceEvent().call();
        await web3.currentProvider.setNextBlockTime(parseInt(nextRebalanceEvent) + 10);
        await blockchainCall(treasuryBootstrapRevenueShare.methods.claimRewardOf, accounts[0]);
    }

    await swap(token, "30000000000000000000");
    await swap(token, "30000000000000000000000", true);
    var x = await treasuryBootstrapRevenueShare.methods.redeemRevenueSharePositionForever(0, 0).call({from : accounts[0]});

    x = [x[0], x[1]].map(it => parseInt(it)).map(it => parseInt(it * 0.97)).map(it => web3Utils.toBN(it).toString());

    await blockchainCall(treasuryBootstrapRevenueShare.methods.redeemRevenueSharePositionForever, x[0], x[1]);
    await assert.catchCall(blockchainCall(treasuryBootstrapRevenueShare.methods.redeemRevenueSharePositionForever, x[0], x[1]), 'unknown account');
    await blockchainCall(treasuryBootstrapRevenueShare.methods.collectFees, abi.encode(["uint24", "uint256"], [0, 0]));

    await blockchainCall(treasuryBootstrapRevenueShare.methods.claimRewardOf, accounts[10]);

    await swap(token, "30000000000000000000");
    await blockchainCall(treasuryBootstrapRevenueShare.methods.claimRewardOf, accounts[10]);

    await swap(token, "30000000000000000000");
    await blockchainCall(treasuryBootstrapRevenueShare.methods.collectFees, abi.encode(["uint24", "uint256"], [0, 0]));
    await blockchainCall(treasuryBootstrapRevenueShare.methods.claimReward, [accounts[11], accounts[12], accounts[13]], [toDecimals(0.3, 18), toDecimals(0.05, 18)], {from : accounts[6]});

    console.log("Storage", storage = await treasuryBootstrap.methods._storage().call());
    await dumpAdditionalFunctionsStatus(token, true);

    console.log("BALANCE:", await token.methods.balanceOf(token.options.address).call());

    await vestingAndMintTest(vestingContract, token, treasuryBootstrap);

    await assert.catchCall(treasuryBootstrap.methods._storage().call());
    await dumpAdditionalFunctionsStatus(token, true);

    await blockchainCall(treasuryBootstrapRevenueShare.methods.redeemVestingResult, {from : accounts[6]});

    console.log("BALANCE Token:", await token.methods.balanceOf(token.options.address).call());
    console.log("BALANCE Bootstra:", await token.methods.balanceOf(vestingContract.address).call());
    console.log("BALANCE Revenue share:", await token.methods.balanceOf(treasuryBootstrapRevenueShare.options.address).call());
};

async function vestingAndMintTest(vestingContract, token, treasuryBootstrap) {

    var addresses = [...(vestingContract.vestings[0].owners), ...(vestingContract.vestings[1].owners)];

    var amount = 25;
    var trance1 = addresses.slice(0, amount);
    var trance2 = addresses.slice(amount, amount*2);
    var trance3 = addresses.slice(amount * 2);

    await blockchainCall(vestingContract.contract.methods.claimBatch, [vestingContract.vestings[0].owners[0], vestingContract.vestings[1].owners[0]]);

    var date = new Date();
    date.setDate(date.getDate() + 13);
    date = date.getTime();
    date /= 1000;
    date = parseInt(date);

    await web3.currentProvider.setNextBlockTime(date);
    await blockchainCall(vestingContract.contract.methods.claimBatch, [vestingContract.vestings[0].owners[0], vestingContract.vestings[1].owners[0]]);

    var date = new Date(date * 1000);
    date.setMonth(date.getMonth() + 3);
    date = date.getTime();
    date /= 1000;
    date = parseInt(date);

    await web3.currentProvider.setNextBlockTime(date);
    await blockchainCall(vestingContract.contract.methods.claimBatch, [vestingContract.vestings[0].owners[0], vestingContract.vestings[1].owners[0]]);

    date = new Date(date * 1000);
    date.setDate(date.getDate() + 13);
    date = date.getTime();
    date /= 1000;
    date = parseInt(date);

    await web3.currentProvider.setNextBlockTime(date);

    await blockchainCall(vestingContract.contract.methods.claimBatch, trance1);

    await assert.catchCall(blockchainCall(token.methods.mint, accounts[9], "1234567000000000000000000"), "unauthorized");
    await assert.catchCall(blockchainCall(token.methods.mint, accounts[9], "1234567000000000000000000", additionalData), "Mint still not available");

    storage = await treasuryBootstrap.methods._storage().call();

    var oldMintReeleaseStarts = parseInt(storage.mintReleaseStarts);

    await web3.currentProvider.setNextBlockTime(parseInt(storage.mintReleaseStarts) + 10);
    var snapshotId = await web3.currentProvider.api.evm_snapshot();
    await blockchainCall(token.methods.mint, accounts[9], "1234567000000000000000000", additionalData);
    await web3.currentProvider.api.evm_revert(snapshotId);

    await assert.catchCall(blockchainCall(token.methods.mint, accounts[9], "1234567000000000000000000"), "unauthorized");

    var secondsIncrease = 10000;
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.increaseMintOwnershipReleaseTime, secondsIncrease), "unauthorized");

    await blockchainCall(treasuryBootstrap.methods.increaseMintOwnershipReleaseTime, secondsIncrease, additionalData);

    storage = await treasuryBootstrap.methods._storage().call();

    assert.strictEqual(oldMintReeleaseStarts + secondsIncrease, parseInt(storage.mintReleaseStarts));

    await assert.catchCall(blockchainCall(token.methods.mint, accounts[9], "1234567000000000000000000"), "unauthorized");
    await assert.catchCall(blockchainCall(token.methods.mint, accounts[9], "1234567000000000000000000", additionalData), "Mint still not available");

    await web3.currentProvider.setNextBlockTime(parseInt(storage.mintReleaseStarts) + 10);
    await assert.catchCall(blockchainCall(token.methods.mint, accounts[9], "1234567000000000000000000"), "unauthorized");
    await blockchainCall(token.methods.mint, accounts[9], "1234567000000000000000000", additionalData);

    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.increaseMintOwnershipReleaseTime, secondsIncrease));
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.increaseMintOwnershipReleaseTime, secondsIncrease, additionalData));

    await assert.catchCall(treasuryBootstrap.methods._storage().call());
    await dumpAdditionalFunctionsStatus(token, true);

    date = new Date(date * 1000);
    date.setFullYear(date.getFullYear() + 3);
    date = date.getTime();
    date /= 1000;
    date = parseInt(date);

    await web3.currentProvider.setNextBlockTime(date);

    await blockchainCall(vestingContract.contract.methods.claimBatch, trance1);
    await blockchainCall(vestingContract.contract.methods.claimBatch, trance2);

    date = new Date(date * 1000);
    date.setFullYear(date.getFullYear() + 3);
    date = date.getTime();
    date /= 1000;
    date = parseInt(date);

    await web3.currentProvider.setNextBlockTime(date);

    await blockchainCall(vestingContract.contract.methods.claimBatch, trance3);
    await blockchainCall(vestingContract.contract.methods.claimBatch, trance3);

    console.log("BALANCE:", await token.methods.balanceOf(vestingContract.address).call());
}

global.attachProtocolAddress = async function attachProtocolAddress(protocolAddress) {
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.setProtocolAddress, protocolAddress), "unauthorized");
    await blockchainCall(treasuryBootstrap.methods.setProtocolAddress, protocolAddress, additionalData);
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.setProtocolAddress, protocolAddress));
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.setProtocolAddress, protocolAddress, additionalData));
    await dumpAdditionalFunctionsStatus(treasuryBootstrap, true);
};

async function changeNameAndSymbol(treasuryBootstrap, token) {
    console.log({
        name : await token.methods.name().call(),
        symbol : await token.methods.symbol().call(),
        decimals : await token.methods.decimals().call()
    });

    var code = path.resolve(__dirname, 'NameAndSymbol.sol');
    code = fs.readFileSync(code, 'UTF-8');
    var NameAndSymbol = await compile(code, 'NameAndSymbol');
    var nameAndSymbol = await deployContract(new web3.eth.Contract(NameAndSymbol.abi), NameAndSymbol.bin, additionalData);
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.setFinalNameAndSymbol, nameAndSymbol.options.address), "unauthorized");
    await blockchainCall(treasuryBootstrap.methods.setFinalNameAndSymbol, nameAndSymbol.options.address, additionalData);
    await assert.catchCall(blockchainCall(treasuryBootstrap.methods.setFinalNameAndSymbol, nameAndSymbol.options.address, additionalData));

    console.log({
        name : await token.methods.name().call(),
        symbol : await token.methods.symbol().call(),
        decimals : await token.methods.decimals().call()
    });

}