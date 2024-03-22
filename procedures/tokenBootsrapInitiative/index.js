var keccak = require('keccak');
var { VOID_ETHEREUM_ADDRESS, abi, VOID_BYTES32, blockchainCall, sendBlockchainTransaction, numberToString, compile, sendAsync, deployContract, abi, MAX_UINT256, web3Utils, fromDecimals, toDecimals } = global.multiverse = require('@ethereansos/multiverse');
Object.entries(global.multiverse).forEach(it => global[it[0]] = it[1]);

var additionalData = {from : web3.currentProvider.knowledgeBase.from};

var specialComponent;

async function deployVestingContract(bootstrapStarts) {
    var VestingContract = await compile('@ethereans-labs/kaiten-token/contracts/vert/VestingContract');

    var vestingContract = await deployContract(new web3.eth.Contract(VestingContract.abi), VestingContract.bin, [VOID_ETHEREUM_ADDRESS, global.vestings = (global.vestings || []).map(it => ({...it, info : {...it.info, startingFrom : it.info.startingFrom + bootstrapStarts}}))], additionalData);

    var i = 0;
    while(true) {
        try {
            var info = await vestingContract.methods.infos(i++).call();
            if(info.startingFrom === '0') {
                break;
            }
            console.log('Starting from:', new Date(parseInt(info.startingFrom) * 1000).toLocaleString());
        } catch(e) {
            break;
        }
    }

    var amount = '0';

    for(var vesting of vestings) {
        for(var amt of vesting.amounts) {
            amount = amount.ethereansosAdd(amt);
        }
    }

    return {
        vestings,
        contract : vestingContract,
        address : vestingContract.options.address,
        amount
    };
}

module.exports = async function start(testUnauthorizedCompleteInitialization) {

    try {
        await web3.currentProvider.api.evm_setAccountBalance(web3.currentProvider.knowledgeBase.fromAddress, web3Utils.toHex(toDecimals(3, 18)));
    } catch(e) {
        console.error(e);
    }

    console.log(await web3.eth.getBalance(web3.currentProvider.knowledgeBase.fromAddress));

    var bootstrapStarts = new Date(process.env.BOOTSTRAP_STARTS || new Date().getTime());
    bootstrapStarts = parseInt(bootstrapStarts.getTime() / 1000);
    console.log("Bootstrap Starts", new Date(bootstrapStarts * 1000).toISOString(), new Date(bootstrapStarts * 1000).toString());

    var vestingContract = await deployVestingContract(bootstrapStarts);
    web3.currentProvider.knowledgeBase.KAI_VESTING_CONTRACT_ADDRESS = web3Utils.toChecksumAddress(vestingContract.address);
    web3.currentProvider.knowledgeBase.KAI_VESTING_CONTRACT_AMOUNT = vestingContract.amount;

    var TreasuryBootstrapRevenueShareLib = await compile('@ethereans-labs/kaiten-token/contracts/vert/TreasuryBootstrapRevenueShare', "TreasuryBootstrapRevenueShareLib");
    var treasuryBootstrapRevenueShareLib = await deployContract(new web3.eth.Contract(TreasuryBootstrapRevenueShareLib.abi), TreasuryBootstrapRevenueShareLib.bin, [], additionalData);
    var treasuryBootstrapRevenueShareLibAddress = web3Utils.toChecksumAddress(treasuryBootstrapRevenueShareLib.options.address);

    var path1 = TreasuryBootstrapRevenueShareLib.ast.absolutePath + ":" + TreasuryBootstrapRevenueShareLib.name;
    var key1 = '__$' + keccak('keccak256').update(path1).digest().toString('hex').slice(0, 34) + '$__';

    var TreasuryBootstrapRevenueShare = await compile('@ethereans-labs/kaiten-token/contracts/vert/TreasuryBootstrapRevenueShare', undefined, undefined, true);
    TreasuryBootstrapRevenueShare.bin = TreasuryBootstrapRevenueShare.bin.split(key1).join(treasuryBootstrapRevenueShareLibAddress.substring(2));
    TreasuryBootstrapRevenueShare['bin-runtime'] = (TreasuryBootstrapRevenueShare['bin-runtime'] || '').split(key1).join(treasuryBootstrapRevenueShareLibAddress.substring(2));

    var treasuryBootstrapRevenueShareArgs = [
        web3.currentProvider.knowledgeBase.fromAddress,
        web3.currentProvider.knowledgeBase.revenueShareDestination,
        web3.currentProvider.knowledgeBase.revenueShareFeesInTokenCollector,
        3,//Revenue share season starts from 3 months then halving to 1
        web3.currentProvider.knowledgeBase.UNISWAP_V3_NONFUNGIBLE_POSITION_MANAGER,
        web3.currentProvider.knowledgeBase.UNISWAP_V3_SWAP_ROUTER,
        10000,//pool fee
        "468855016456061846625200942",//token initial price
        "30000000000000000",//price slippage
        "-102600",
        "-47000"
    ];
    var treasuryBootstrapRevenueShare = await deployContract(new web3.eth.Contract(TreasuryBootstrapRevenueShare.abi), TreasuryBootstrapRevenueShare.bin, treasuryBootstrapRevenueShareArgs, additionalData);
    web3.currentProvider.knowledgeBase.KAI_TREASURY_BOOTSTRAP_REVENUE_SHARE_ADDRESS = web3Utils.toChecksumAddress(treasuryBootstrapRevenueShare.options.address);

    var TreasuryBootstrap = await compile('@ethereans-labs/kaiten-token/contracts/vert/TreasuryBootstrap');
    var treasuryBootstrapArgs = {
        bootstrapStarts: bootstrapStarts,
        marketingAddress : web3.currentProvider.knowledgeBase.marketingDestination,
        bootstrapAddress : web3.currentProvider.knowledgeBase.projectBootstrapDestination,
        treasuryAddress : VOID_ETHEREUM_ADDRESS,
        actualPriceWindow : 0,
        availableTokensPerWindow : ["386000000000000000000000", "618000000000000000000000", "2364000000000000000000000", "4632000000000000000000000"],
        pricesPerWindow : ["40000000000000", "50000000000000", "60000000000000", "70000000000000"],
        treasuryBootstrapRevenueShareAddress : treasuryBootstrapRevenueShare.options.address,
        treasuryBootstrapFirstRevenueShareAmount : "0",
        treasuryBalance : "2000000000000000000000000",
        finalPositionAmount : "5000000000000000000000000",
        treasuryBootstrapRevenueShareOperator : VOID_ETHEREUM_ADDRESS,
        bootstrapEnds : bootstrapStarts + 1037000,//12 days after bootstrap
        antiWhaleSystemEnds : 172800,//2 days after the end of bootstrap period
        mintReleaseStarts : bootstrapStarts + 55120000,//638 days (1,8 years) after bootstrap
        collectedETH : 0,
        purchasedSupply : 0
    };
    treasuryBootstrapArgs = [Object.values(treasuryBootstrapArgs)];
    var treasuryBootstrap = await deployContract(new web3.eth.Contract(TreasuryBootstrap.abi), TreasuryBootstrap.bin, treasuryBootstrapArgs, additionalData);
    var treasuryBootstrapAddress = treasuryBootstrap.options.address;

    var Token = await compile('@ethereans-labs/kaiten-token/contracts/vert/Token');
    var tokenArgs = [
        web3.currentProvider.knowledgeBase.fromAddress,
        [
            "mint(address,uint256)",
            "transfer(address,uint256)",
            "transferFrom(address,address,uint256)",
            "",
            "_storage()",
            "completeInitialization(address,address[],uint256[])",
            "setFinalNameAndSymbol(address)",
            "tryFinalizeBootstrapAndEnableAntiWhaleSystem()"
        ],
        [
            treasuryBootstrapAddress,
            treasuryBootstrapAddress,
            treasuryBootstrapAddress,
            treasuryBootstrapAddress,
            treasuryBootstrapAddress,
            treasuryBootstrapAddress,
            treasuryBootstrapAddress,
            treasuryBootstrapAddress
        ]
    ];
    var token = await deployContract(new web3.eth.Contract(Token.abi), Token.bin, tokenArgs, additionalData);
    web3.currentProvider.knowledgeBase.KAI_TOKEN_ADDRESS = web3Utils.toChecksumAddress(token.options.address);

    treasuryBootstrapAddress = web3.currentProvider.knowledgeBase.KAI_TOKEN_ADDRESS;
    treasuryBootstrap = new web3.eth.Contract(TreasuryBootstrap.abi, treasuryBootstrapAddress);

    specialComponent = await require('../organizationWithSpecialComponent')();

    if(testUnauthorizedCompleteInitialization) {
        await assert.catchCall(blockchainCall(treasuryBootstrap.methods.completeInitialization, web3.currentProvider.knowledgeBase.KAI_DAO_TREASURY_ADDRESS, [web3.currentProvider.knowledgeBase.KAI_VESTING_CONTRACT_ADDRESS, web3.currentProvider.knowledgeBase.marketingDestination], [web3.currentProvider.knowledgeBase.KAI_VESTING_CONTRACT_AMOUNT, web3.currentProvider.knowledgeBase.KAI_MARKETING_AMOUNT]), "unauthorized");
    }

    await blockchainCall(treasuryBootstrap.methods.completeInitialization, web3.currentProvider.knowledgeBase.KAI_DAO_TREASURY_ADDRESS, [web3.currentProvider.knowledgeBase.KAI_VESTING_CONTRACT_ADDRESS, web3.currentProvider.knowledgeBase.marketingDestination], [web3.currentProvider.knowledgeBase.KAI_VESTING_CONTRACT_AMOUNT, web3.currentProvider.knowledgeBase.KAI_MARKETING_AMOUNT], additionalData);

    var bootstrapEnds = parseInt((await treasuryBootstrap.methods._storage().call()).bootstrapEnds);
    console.log("Bootstrap Ends", new Date(bootstrapEnds * 1000).toISOString(), new Date(bootstrapEnds * 1000).toString());

    console.log(await web3.eth.getBalance(web3.currentProvider.knowledgeBase.fromAddress));

    return vestingContract;
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

module.exports.test = async function test() {

    await web3.currentProvider.api.evm_setAccountBalance(web3.currentProvider.knowledgeBase.fromAddress, web3Utils.toHex(toDecimals(9999999999, 18)));

    var TreasuryBootstrapRevenueShare = await compile('@ethereans-labs/kaiten-token/contracts/vert/TreasuryBootstrapRevenueShare', undefined, undefined, true);
    var treasuryBootstrapRevenueShare = new web3.eth.Contract(TreasuryBootstrapRevenueShare.abi, web3.currentProvider.knowledgeBase.KAI_TREASURY_BOOTSTRAP_REVENUE_SHARE_ADDRESS);

    var TreasuryBootstrap = await compile('@ethereans-labs/kaiten-token/contracts/vert/TreasuryBootstrap');
    var treasuryBootstrap = new web3.eth.Contract(TreasuryBootstrap.abi, web3.currentProvider.knowledgeBase.KAI_TOKEN_ADDRESS);
    var tokenAddress = treasuryBootstrap.options.address;

    await web3.eth.sendTransaction({
        from : accounts[0],
        to : tokenAddress,
        value : "5000000000000000000",
        gas : '6000000'
    });

    await web3.eth.sendTransaction({
        from : accounts[1],
        to : tokenAddress,
        value : "60000000000000000000",
        gas : '6000000'
    });

    var storage = await treasuryBootstrap.methods._storage().call();

    var setTreasuryAddressPayload = treasuryBootstrapRevenueShare.methods.setTreasuryAddress(accounts[9]).encodeABI();
    setTreasuryAddressPayload = specialComponent.methods.submit(treasuryBootstrapRevenueShare.options.address, setTreasuryAddressPayload, accounts[9]).encodeABI();

    assert.equals(web3.currentProvider.knowledgeBase.KAI_DAO_TREASURY_ADDRESS, await treasuryBootstrapRevenueShare.methods.treasuryAddress().call());

    await assert.catchCall(blockchainCall(treasuryBootstrapRevenueShare.methods.setTreasuryAddress, accounts[9]), "in vesting period");
    await assert.catchCall(blockchainCall(specialComponent.methods.submit, web3.currentProvider.knowledgeBase.KAI_DAO_TREASURY_ADDRESS, setTreasuryAddressPayload, VOID_ETHEREUM_ADDRESS, additionalData), "in vesting period");

    await web3.currentProvider.setNextBlockTime(parseInt(storage.bootstrapEnds) + 10);
    await blockchainCall(treasuryBootstrap.methods.tryFinalizeBootstrapAndEnableAntiWhaleSystem);

    await assert.catchCall(blockchainCall(treasuryBootstrapRevenueShare.methods.collectFees, abi.encode(["uint256", "uint256"], [0, 0])), "in vesting period");

    storage = await treasuryBootstrap.methods._storage().call();
    await web3.currentProvider.setNextBlockTime(parseInt(storage.antiWhaleSystemEnds) + 10);

    await blockchainCall(treasuryBootstrap.methods.tryDisableAntiWhaleSystem);

    console.log("Vesting Ends", new Date(parseInt(await treasuryBootstrapRevenueShare.methods.vestingEnds().call()) * 1000).toString());

    var antiWhaleSystemEnds = parseInt((await treasuryBootstrap.methods._storage().call()).antiWhaleSystemEnds);
    console.log("Anti Whale System Ends", new Date(antiWhaleSystemEnds * 1000).toISOString(), new Date(antiWhaleSystemEnds * 1000).toString());

    assert.equals(web3.currentProvider.knowledgeBase.KAI_DAO_TREASURY_ADDRESS, await treasuryBootstrapRevenueShare.methods.treasuryAddress().call());

    await assert.catchCall(blockchainCall(treasuryBootstrapRevenueShare.methods.setTreasuryAddress, accounts[9]), "unauthorized");
    await blockchainCall(specialComponent.methods.submit, web3.currentProvider.knowledgeBase.KAI_DAO_TREASURY_ADDRESS, setTreasuryAddressPayload, VOID_ETHEREUM_ADDRESS, additionalData);

    assert.equals(accounts[9], await treasuryBootstrapRevenueShare.methods.treasuryAddress().call());
    await assert.catchCall(blockchainCall(specialComponent.methods.submit, web3.currentProvider.knowledgeBase.KAI_DAO_TREASURY_ADDRESS, setTreasuryAddressPayload, VOID_ETHEREUM_ADDRESS, additionalData), "unauthorized");

    await blockchainCall(treasuryBootstrapRevenueShare.methods.setTreasuryAddress, accounts[10], {from : accounts[9]});
    assert.equals(accounts[10], await treasuryBootstrapRevenueShare.methods.treasuryAddress().call());

    await assert.catchCall(blockchainCall(treasuryBootstrapRevenueShare.methods.setTreasuryAddress, accounts[10], {from : accounts[9]}), "unauthorized");

    await assert.catchCall(blockchainCall(treasuryBootstrapRevenueShare.methods.setTreasuryAddress, accounts[9]), "unauthorized");

    await web3.currentProvider.setNextBlockTime(parseInt(await treasuryBootstrapRevenueShare.methods.nextRebalanceEvent().call()) + 1);

    await swap(treasuryBootstrap, "100000000000000000000");
    await blockchainCall(treasuryBootstrapRevenueShare.methods.collectFees, abi.encode(["uint256", "uint256"], [0, 0]));

    await blockchainCall(treasuryBootstrapRevenueShare.methods.claimRewardOf, accounts[0]);
    await blockchainCall(treasuryBootstrapRevenueShare.methods.claimRewardOf, accounts[1]);

    await blockchainCall(treasuryBootstrapRevenueShare.methods.redeemRevenueSharePositionForever, 0, 0);

    await swap(treasuryBootstrap, "100000000000000000000");
    await web3.currentProvider.setNextBlockTime(parseInt(await treasuryBootstrapRevenueShare.methods.nextRebalanceEvent().call()) + 1);
    await blockchainCall(treasuryBootstrapRevenueShare.methods.claimRewardOf, accounts[0]);
    await blockchainCall(treasuryBootstrapRevenueShare.methods.claimRewardOf, accounts[1]);

}