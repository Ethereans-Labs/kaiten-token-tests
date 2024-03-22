var { VOID_ETHEREUM_ADDRESS, abi, VOID_BYTES32, blockchainCall, sendBlockchainTransaction, numberToString, compile, sendAsync, deployContract, abi, MAX_UINT256, web3Utils, fromDecimals, toDecimals } = global.multiverse = require('@ethereansos/multiverse');

var fs = require('fs');
var path = require('path');

var additionalData = {from : web3.currentProvider.knowledgeBase.from};

var orgSpecialComponent;
module.exports = async function start() {
    var organizationAddress = await createOrganization(await createMockOrganizationDeployData(true, true));

    var components = await listComponentsOfOrganization(organizationAddress, [web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_TREASURY_MANAGER, web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_KAITEN_SPECIAL_COMPONENT]);
    web3.currentProvider.knowledgeBase.KAI_DAO_TREASURY_ADDRESS = components[0];

    orgSpecialComponent.options.address = components[1];
    return orgSpecialComponent;
};

module.exports.test = async function test() {

    assert.strictEqual(web3.currentProvider.knowledgeBase.fromAddress, await orgSpecialComponent.methods.owner().call());

    await assert.catchCall(blockchainCall(orgSpecialComponent.methods.setOwner, accounts[0]), 'unauthorized');

    await blockchainCall(orgSpecialComponent.methods.setOwner, accounts[0], additionalData);

    assert.strictEqual(accounts[0], await orgSpecialComponent.methods.owner().call());

    await assert.catchCall(blockchainCall(orgSpecialComponent.methods.setOwner, accounts[1], additionalData), 'unauthorized');
    await blockchainCall(orgSpecialComponent.methods.setOwner, accounts[1]);

    assert.strictEqual(accounts[1], await orgSpecialComponent.methods.owner().call());

    await assert.catchCall(blockchainCall(orgSpecialComponent.methods.setOwner, accounts[2]), 'unauthorized');
    await assert.catchCall(blockchainCall(orgSpecialComponent.methods.setOwner, accounts[2], additionalData), 'unauthorized');

    var code = path.resolve(__dirname, 'IOrganization.sol');
    code = fs.readFileSync(code, 'UTF-8');
    IOrganization = await compile(code, 'IOrganization');
    var organization = new web3.eth.Contract(IOrganization.abi, await orgSpecialComponent.methods.host().call());

    var component = {
        key : web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_KAITEN_SPECIAL_COMPONENT,
        location : VOID_ETHEREUM_ADDRESS,
        active : false,
        log : true
    };

    assert.strictEqual("true", (await organization.methods.isActive(orgSpecialComponent.options.address).call()).toString());
    assert.strictEqual("true", (await organization.methods.keyIsActive(web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_KAITEN_SPECIAL_COMPONENT).call()).toString());

    var payload = organization.methods.set(component).encodeABI();

    assert.catchCall(blockchainCall(organization.methods.set, component), "unauthorized");

    await assert.catchCall(blockchainCall(orgSpecialComponent.methods.submit, organization.options.address, payload, VOID_ETHEREUM_ADDRESS), "unauthorized");
    await blockchainCall(orgSpecialComponent.methods.submit, organization.options.address, payload, VOID_ETHEREUM_ADDRESS, {from : accounts[1]});

    assert.strictEqual("false", (await organization.methods.isActive(orgSpecialComponent.options.address).call()).toString());
    assert.strictEqual("false", (await organization.methods.keyIsActive(web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_KAITEN_SPECIAL_COMPONENT).call()).toString());

    await assert.catchCall(blockchainCall(orgSpecialComponent.methods.submit, organization.options.address, payload, VOID_ETHEREUM_ADDRESS), "unauthorized");
    await assert.catchCall(blockchainCall(orgSpecialComponent.methods.submit, organization.options.address, payload, VOID_ETHEREUM_ADDRESS, {from : accounts[1]}), "unauthorized");
};

async function getTokenDecimals(tokenAddress) {
    var response = await web3.eth.call({
        to : tokenAddress,
        data : web3Utils.sha3('decimals()').substring(0, 10)
    });

    response = abi.decode(["uint256"], response)[0].toString();
    return parseInt(response);
}

async function getFactoryList(index) {
    var data = web3Utils.sha3('get(uint256)').substring(0, 10);
    index = abi.encode(["uint256"], [index]).substring(2);
    data += index;
    var response = await web3.eth.call({
        to : web3.currentProvider.knowledgeBase.FACTORY_OF_FACTORIES,
        data
    });

    response = abi.decode(["address", "address[]"], response);
    response = [...response[1]];

    return response;
}

async function listComponentsOfOrganization(organizationAddress, keys) {
    var data = web3Utils.sha3('list(bytes32[])').substring(0, 10);
    index = abi.encode(["bytes32[]"], [keys]).substring(2);
    data += index;
    var response = await web3.eth.call({
        to : organizationAddress,
        data
    });

    response = abi.decode(["address[]"], response);
    response = [...response[0]];

    return response;
}

async function deploySpecialComponentData() {
    var code = path.resolve(__dirname, 'OrgSpecialComponent.sol');
    code = fs.readFileSync(code, 'UTF-8');
    var OrgSpecialComponent = await compile(code, 'OrgSpecialComponent');
    orgSpecialComponent = new web3.eth.Contract(OrgSpecialComponent.abi);

    var key = web3Utils.sha3('KAITEN_SPECIAL_COMPONENT');
    web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_KAITEN_SPECIAL_COMPONENT = key;
    var active = true;
    var modelOrLocation = VOID_ETHEREUM_ADDRESS;
    var modelOrLocationData = orgSpecialComponent.deploy({ data : OrgSpecialComponent.bin, arguments : ["0x"]}).encodeABI();
    var lazyInitData = abi.encode(["address"], [web3.currentProvider.knowledgeBase.fromAddress]);

    var specialComponentData = abi.encode(["bytes32", "bool", "address", "bytes", "bytes"], [key, active, modelOrLocation, modelOrLocationData, lazyInitData]);

    return specialComponentData;
}

async function createMockOrganizationDeployData(noRootProposal, noFixedInflation) {

    var organizationUri = "ipfs://QmYrXiACwqvVnk7A7xhERqkxBQZJzj212jfFSHasS7tCAn";

    var tokenAddress = web3.currentProvider.knowledgeBase.KAI_TOKEN_ADDRESS || web3.currentProvider.knowledgeBase.WETH_ADDRESS;

    var proposalRules = {
        host : web3.currentProvider.knowledgeBase.fromAddress,
        proposalDuration : 604800,
        hardCapPercentage : 17,
        quorumPercentage : 13,
        validationBomb : 1210000
    }

    var proposalsManagerLazyInitData = noRootProposal ? {} : {
        ...proposalRules
    };

    var proposalModelsData = {
        transferManager : {...proposalRules, maxPercentagePerToken : 20},
        delegationsManagerBan : {...proposalRules},
        delegationsManagerInsurance : {...proposalRules, presetValues : [30, 50, 90, 100, 200, 250]},
        changeInvestmentsManagerTokensFromETHList : {...proposalRules, maxTokens : 5},
        changeInvestmentsManagerTokensToETHList : {...proposalRules, maxTokens : 5, maxPercentagePerToken : 20}
    }

    var fixedInflationManagerLazyInitData = noFixedInflation ? undefined : {
        tokenMinterOwner :  accounts[0],
        inflationPercentage : 5,
        _bootstrapFundWalletAddress: accounts[1],
        _bootstrapFundWalletPercentage: 25,
        _rawTokenComponentKeys : [],
        _rawTokenComponentsPercentages : [],
        _swappedTokenComponentKeys : [web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_TREASURY_SPLITTER_MANAGER],
        _swappedTokenComponentsPercentages : [],
        ammPlugin : accounts[0],
        liquidityPoolAddresses : [web3.currentProvider.knowledgeBase.OS_ETH_LP],
        swapPath : [web3.currentProvider.knowledgeBase.WETH_ADDRESS],
        executionInterval : 5000,
        firstExecution : 0
    };
    proposalModelsData.fixedInflation = noFixedInflation ? undefined : {
        presetValues : [0.5, 3, 5, 9, 11, 16],
        ...proposalRules
    }

    var treasurySplitterManagerLazyInitData = {
        keys : [
            web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_DELEGATIONS_MANAGER,
            web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_INVESTMENTS_MANAGER
        ],
        percentages : [
            30
        ],
        splitInterval : 3500,
        firstSplit : 0
    };

    var delegationsManagerLazyInitData = {
        delegationAttachInsurance : 0
    };

    var investmentsManagerLazyInitData = {
        operations : getInvestmentsManagerMockOperations(),
        swapToEtherInterval : 100,
        firstSwapToEtherEvent : 0
    };

    return {
        organizationUri,
        tokenAddress,
        proposalsManagerLazyInitData,
        fixedInflationManagerLazyInitData,
        treasurySplitterManagerLazyInitData,
        delegationsManagerLazyInitData,
        investmentsManagerLazyInitData,
        proposalModelsData
    };
}

function getInvestmentsManagerMockOperations() {
    return [];
    return [{
        inputTokenAddress : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        ammPlugin : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        liquidityPoolAddresses : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address],
        swapPath : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address]
    }, {
        inputTokenAddress : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        ammPlugin : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        liquidityPoolAddresses : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address],
        swapPath : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address]
    }, {
        inputTokenAddress : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        ammPlugin : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        liquidityPoolAddresses : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address],
        swapPath : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address]
    }, {
        inputTokenAddress : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        ammPlugin : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        liquidityPoolAddresses : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address],
        swapPath : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address]
    }, {
        inputTokenAddress : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        ammPlugin : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        liquidityPoolAddresses : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address],
        swapPath : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address]
    }, {
        ammPlugin : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        liquidityPoolAddresses : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address],
        swapPath : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address]
    }, {
        ammPlugin : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        liquidityPoolAddresses : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address],
        swapPath : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address]
    }, {
        ammPlugin : web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address,
        liquidityPoolAddresses : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address],
        swapPath : [web3.currentProvider.knowledgeBase.ERC20Tokens.OS.address]
    }];
}

async function createOrganization(organizationDeployData) {
    var OrganizationFactory = await compile("@ethereansos/swissknife/contracts/factory/model/IFactory");
    var list = await getFactoryList(web3.currentProvider.knowledgeBase.factoryIndices.organization);
    list = list[list.length - 1];
    var organizationFactory = new web3.eth.Contract(OrganizationFactory.abi, list);

    var deployData = await createOrganizationDeployData(organizationDeployData);

    var transaction = await blockchainCall(organizationFactory.methods.deploy, deployData, additionalData);

    var log = transaction.logs.filter(it => it.topics[0] === web3Utils.sha3('Deployed(address,address,address,bytes)'));
    log = log[log.length - 1];
    var address = log.topics[2];
    address = abi.decode(["address"], address)[0].toString();

    return address;
}

async function createOrganizationDeployData(organizationDeployData) {

    var { tokenAddress, organizationUri, proposalsManagerLazyInitData, fixedInflationManagerLazyInitData, treasurySplitterManagerLazyInitData, delegationsManagerLazyInitData, investmentsManagerLazyInitData } = organizationDeployData;

    proposalsManagerLazyInitData && (proposalsManagerLazyInitData.tokenAddress = tokenAddress);
    delegationsManagerLazyInitData.tokenAddress = tokenAddress;
    fixedInflationManagerLazyInitData && (fixedInflationManagerLazyInitData.tokenAddress = tokenAddress);

    proposalsManagerLazyInitData = await createProposalsManagerLazyInitData(proposalsManagerLazyInitData);
    fixedInflationManagerLazyInitData = await createFixedInflationManagerLazyInitData(fixedInflationManagerLazyInitData);
    treasurySplitterManagerLazyInitData = await createTreasurySplitterManagerLazyInitData(treasurySplitterManagerLazyInitData);
    delegationsManagerLazyInitData = await createDelegationsManagerLazyInitData(delegationsManagerLazyInitData);
    investmentsManagerLazyInitData = await createInvestmentsManagerLazyInitData(investmentsManagerLazyInitData);

    mandatoryComponentsDeployData = [proposalsManagerLazyInitData];
    additionalComponents = [1, 5, 6, 7];
    additionalComponentsDeployData = ['0x', treasurySplitterManagerLazyInitData, delegationsManagerLazyInitData, investmentsManagerLazyInitData];
    specialComponentsData = [];
    specificOrganizationData = await createSubDAOProposalModels(organizationDeployData.proposalModelsData);

    if(fixedInflationManagerLazyInitData != '0x') {
        additionalComponents = [...additionalComponents.slice(0, 1), 4, ...additionalComponents.slice(1)];
        additionalComponentsDeployData = [...additionalComponentsDeployData.slice(0, 1), fixedInflationManagerLazyInitData, ...additionalComponentsDeployData.slice(1)];
    }

    additionalComponents = [1];
    additionalComponentsDeployData = ["0x"];
    specialComponentsData = [await deploySpecialComponentData()]

    var organizationDeployData = {
        uri : organizationUri,
        mandatoryComponentsDeployData,
        additionalComponents,
        additionalComponentsDeployData,
        specialComponentsData,
        specificOrganizationData
    };

    var type = 'tuple(string,bytes[],uint256[],bytes[],bytes[],bytes)';
    var deployData = abi.encode([type], [Object.values(organizationDeployData)]);

    return deployData;
}

function createProposalRules(data) {

    var {proposalDuration, hardCapPercentage, quorumPercentage, validationBomb} = data;

    var canTerminateAddresses = [];
    var validatorsAddresses = [];
    var canTerminateData = [];
    var validatorsData = [];

    if(proposalDuration) {
        canTerminateAddresses.push(1);
        canTerminateData.push(abi.encode(["uint256"], [proposalDuration]));
    }

    if(hardCapPercentage) {
        canTerminateAddresses.push(2);
        canTerminateData.push(abi.encode(["uint256", "bool"], [toDecimals(hardCapPercentage / 100, 18), true]));
    }

    if(quorumPercentage) {
        validatorsAddresses.push(3);
        validatorsData.push(abi.encode(["uint256", "bool"], [toDecimals(quorumPercentage / 100, 18), true]));
    }

    if(validationBomb) {
        validatorsAddresses.push(4);
        validatorsData.push(abi.encode(["uint256"], [validationBomb]));
    }

    canTerminateAddresses = canTerminateAddresses.map(it => abi.decode(["address"], abi.encode(["uint256"], [it]))[0].toString());
    validatorsAddresses = validatorsAddresses.map(it => abi.decode(["address"], abi.encode(["uint256"], [it]))[0].toString());

    return {
        canTerminateAddresses,
        validatorsAddresses,
        canTerminateData,
        validatorsData
    }
}

async function createProposalsManagerLazyInitData(data) {

    var {tokenAddress, host} = data;

    var {
        canTerminateAddresses,
        validatorsAddresses,
        canTerminateData,
        validatorsData
    } = createProposalRules(data);

    var tokens = tokenAddress;
    tokens = tokens && (Array.isArray(tokens) ? tokens : [tokens]);

    var proposalConfiguration = {
        collections : tokens.map(() => VOID_ETHEREUM_ADDRESS),
        objectIds : tokens.map(it => abi.decode(["uint256"], abi.encode(["address"], [it]))[0].toString()),
        weights : tokens.map(() => 1),
        creationRules : VOID_ETHEREUM_ADDRESS,
        triggeringRules : VOID_ETHEREUM_ADDRESS,
        canTerminateAddresses,
        validatorsAddresses,
        creationData : !host || host === VOID_ETHEREUM_ADDRESS ? '0x' : abi.encode(["address", "bool"], [host, true]),
        triggeringData : '0x',
        canTerminateData,
        validatorsData
    };

    var type = 'tuple(address[],uint256[],uint256[],address,address,address[],address[],bytes,bytes,bytes[],bytes[])';

    var data = abi.encode([type], [Object.values(proposalConfiguration)]);

    return data;
}

async function createFixedInflationManagerLazyInitData(data) {

    if(!data) {
        return '0x';
    }

    var { tokenAddress, tokenMinterOwner, inflationPercentage, _bootstrapFundWalletAddress, _bootstrapFundWalletPercentage, _rawTokenComponentKeys, _rawTokenComponentsPercentages, _swappedTokenComponentKeys, _swappedTokenComponentsPercentages, ammPlugin, liquidityPoolAddresses, swapPath, executionInterval, firstExecution } = data;

    var executorRewardPercentage = web3.currentProvider.knowledgeBase.executorRewardPercentage;
    var prestoAddress = web3.currentProvider.knowledgeBase.PRESTO_ADDRESS;
    var tokenMinter = await createFixedInflationTokenMinter(tokenAddress, tokenMinterOwner);
    var lazyInitData = [];
    inflationPercentage = toDecimals(inflationPercentage / 100, 18);
    _bootstrapFundWalletPercentage = toDecimals(_bootstrapFundWalletPercentage / 100, 18);
    _bootstrapFundWalletOwner = _bootstrapFundWalletAddress;
    _bootstrapFundIsRaw = false;
    _defaultBootstrapFundComponentKey = VOID_BYTES32;
    _rawTokenComponentKeys = _rawTokenComponentKeys || [];
    _rawTokenComponentsPercentages = (_rawTokenComponentsPercentages || []).map(it => toDecimals(it / 100, 18));
    _swappedTokenComponentKeys = _swappedTokenComponentKeys || [];
    _swappedTokenComponentsPercentages = (_swappedTokenComponentsPercentages || []).map(it => toDecimals(it / 100, 18));
    lazyInitData.push(abi.encode(["address", "uint256", "address", "bytes"], [prestoAddress, executorRewardPercentage, tokenAddress, tokenMinter]));
    lazyInitData.push(abi.encode(["uint256", "uint256", "uint256"], [inflationPercentage, executionInterval, firstExecution || 0]));
    lazyInitData.push(abi.encode(["address", "address", "uint256", "bool", "bytes32"], [_bootstrapFundWalletOwner, _bootstrapFundWalletAddress, _bootstrapFundWalletPercentage, _bootstrapFundIsRaw, _defaultBootstrapFundComponentKey]));
    lazyInitData.push(abi.encode(["bytes32[]", "uint256[]", "bytes32[]", "uint256[]"], [_rawTokenComponentKeys, _rawTokenComponentsPercentages, _swappedTokenComponentKeys, _swappedTokenComponentsPercentages]));
    lazyInitData.push(abi.encode(["address", "address[]", "address[]"], [ammPlugin, liquidityPoolAddresses, swapPath]));
    lazyInitData = abi.encode(["bytes[]"], [lazyInitData]);
    return lazyInitData;
}

async function createFixedInflationTokenMinter(tokenAddress, owner) {
    if(!owner) {
        return VOID_ETHEREUM_ADDRESS;
    }

    tokenAddress = web3Utils.toChecksumAddress(tokenAddress);

    var TokenMinter = await getTokenMinter();
    var deployData = new web3.eth.Contract(TokenMinter.abi).deploy({ data: TokenMinter.bin, arguments : [web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_FIXED_INFLATION_MANAGER, tokenAddress, owner || VOID_ETHEREUM_ADDRESS]}).encodeABI();
    return deployData;
}

async function createTreasurySplitterManagerLazyInitData(data) {

    var { keys, percentages, splitInterval, firstSplitEvent } = data;

    var executorRewardPercentage = web3.currentProvider.knowledgeBase.executorRewardPercentage;
    var flushExecutorRewardPercentage = web3.currentProvider.knowledgeBase.executorRewardPercentage;
    var _flushKey = VOID_BYTES32;
    percentages = percentages.map(it => toDecimals(it / 100, 18));
    var lazyInitData = abi.encode(["uint256", "uint256", "bytes32[]", "uint256[]", "bytes32", "uint256", "uint256"], [firstSplitEvent || 0, splitInterval, keys, percentages, _flushKey, flushExecutorRewardPercentage, executorRewardPercentage]);

    return lazyInitData;
}

async function createDelegationsManagerLazyInitData(data) {

    var { tokenAddress, attachInsurance } = data

    var executorRewardPercentage = web3.currentProvider.knowledgeBase.executorRewardPercentage;

    var flusherKey = web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_TREASURY_SPLITTER_MANAGER;

    var list = [];

    try {
        list = await getFactoryList(web3.currentProvider.knowledgeBase.factoryIndices.delegation);
    } catch(e) {}

    var decimals = await getTokenDecimals(tokenAddress);
    attachInsurance = toDecimals(attachInsurance || 0, decimals);

    var lazyInitData = abi.encode(["address[]", "address[]"], [list, []]);
    lazyInitData = abi.encode(["uint256", "address", "bytes32", "bytes"], [attachInsurance, VOID_ETHEREUM_ADDRESS, flusherKey, lazyInitData]);
    lazyInitData = abi.encode(["uint256", "address", "uint256", "bytes"], [executorRewardPercentage, VOID_ETHEREUM_ADDRESS, abi.decode(["uint256"], abi.encode(["address"], [tokenAddress]))[0].toString(), lazyInitData]);

    return lazyInitData;
}

async function createInvestmentsManagerLazyInitData(data) {

    var { operations, swapToEtherInterval, firstSwapToEtherEvent } = data;

    operations = operations.map(it => ({
        inputTokenAddress : it.inputTokenAddress || VOID_ETHEREUM_ADDRESS,
        inputTokenAmount : 0,
        ammPlugin : it.ammPlugin,
        liquidityPoolAddresses : it.liquidityPoolAddresses,
        swapPath : it.swapPath,
        enterInETH : false,
        exitInETH : false,
        tokenMins : [],
        receivers : [],
        receiversPercentages : []
    }))

    var executorRewardPercentage = web3.currentProvider.knowledgeBase.executorRewardPercentage;
    var prestoAddress = web3.currentProvider.knowledgeBase.PRESTO_ADDRESS;
    var _organizationComponentKey = web3.currentProvider.knowledgeBase.grimoire.COMPONENT_KEY_TREASURY_SPLITTER_MANAGER;
    var type = 'tuple(address,uint256,address,address[],address[],bool,bool,uint256[],address[],uint256[])[]';
    operations = abi.encode([type], [operations.map(it => Object.values(it))]);

    var lazyInitData = abi.encode(["bytes32", "uint256", "address", "uint256", "uint256", "bytes"], [_organizationComponentKey, executorRewardPercentage, prestoAddress, firstSwapToEtherEvent || 0, swapToEtherInterval, operations]);

    return lazyInitData;
}

async function createSubDAOProposalModels(proposalModelsData) {
    Object.values(proposalModelsData).forEach(it => it && (it.proposalRules = createProposalRules(it)));
    var subDAOProposalModels = [];
    subDAOProposalModels = [...subDAOProposalModels, {
        source: VOID_ETHEREUM_ADDRESS,
        uri : '',
        isPreset : false,
        presetValues : [
            abi.encode(["uint256"], [toDecimals(proposalModelsData.transferManager.maxPercentagePerToken / 100, 18)])
        ],
        presetProposals : [],
        creationRules : VOID_ETHEREUM_ADDRESS,
        triggeringRules : VOID_ETHEREUM_ADDRESS,
        votingRulesIndex : 0,
        canTerminateAddresses : [proposalModelsData.transferManager.proposalRules.canTerminateAddresses],
        validatorsAddresses : [proposalModelsData.transferManager.proposalRules.validatorsAddresses],
        creationData : '0x',
        triggeringData : '0x',
        canTerminateData : [proposalModelsData.transferManager.proposalRules.canTerminateData],
        validatorsData : [proposalModelsData.transferManager.proposalRules.validatorsData]
    }, {
        source: VOID_ETHEREUM_ADDRESS,
        uri : '',
        isPreset : false,
        presetValues : [],
        presetProposals : [],
        creationRules : VOID_ETHEREUM_ADDRESS,
        triggeringRules : VOID_ETHEREUM_ADDRESS,
        votingRulesIndex : 0,
        canTerminateAddresses : [proposalModelsData.delegationsManagerBan.proposalRules.canTerminateAddresses],
        validatorsAddresses : [proposalModelsData.delegationsManagerBan.proposalRules.validatorsAddresses],
        creationData : '0x',
        triggeringData : '0x',
        canTerminateData : [proposalModelsData.delegationsManagerBan.proposalRules.canTerminateData],
        validatorsData : [proposalModelsData.delegationsManagerBan.proposalRules.validatorsData]
    }, {
        source: VOID_ETHEREUM_ADDRESS,
        uri : '',
        isPreset : true,
        presetValues : proposalModelsData.delegationsManagerInsurance.presetValues.map(it => abi.encode(["uint256"], [it])),
        presetProposals : [],
        creationRules : VOID_ETHEREUM_ADDRESS,
        triggeringRules : VOID_ETHEREUM_ADDRESS,
        votingRulesIndex : 0,
        canTerminateAddresses : [proposalModelsData.delegationsManagerInsurance.proposalRules.canTerminateAddresses],
        validatorsAddresses : [proposalModelsData.delegationsManagerInsurance.proposalRules.validatorsAddresses],
        creationData : '0x',
        triggeringData : '0x',
        canTerminateData : [proposalModelsData.delegationsManagerInsurance.proposalRules.canTerminateData],
        validatorsData : [proposalModelsData.delegationsManagerInsurance.proposalRules.validatorsData]
    }, {
        source: VOID_ETHEREUM_ADDRESS,
        uri : '',
        isPreset : false,
        presetValues : [
            abi.encode(["uint256"], [proposalModelsData.changeInvestmentsManagerTokensFromETHList.maxTokens])
        ],
        presetProposals : [],
        creationRules : VOID_ETHEREUM_ADDRESS,
        triggeringRules : VOID_ETHEREUM_ADDRESS,
        votingRulesIndex : 0,
        canTerminateAddresses : [proposalModelsData.changeInvestmentsManagerTokensFromETHList.proposalRules.canTerminateAddresses],
        validatorsAddresses : [proposalModelsData.changeInvestmentsManagerTokensFromETHList.proposalRules.validatorsAddresses],
        creationData : '0x',
        triggeringData : '0x',
        canTerminateData : [proposalModelsData.changeInvestmentsManagerTokensFromETHList.proposalRules.canTerminateData],
        validatorsData : [proposalModelsData.changeInvestmentsManagerTokensFromETHList.proposalRules.validatorsData]
    }, {
        source: VOID_ETHEREUM_ADDRESS,
        uri : '',
        isPreset : false,
        presetValues : [
            abi.encode(["uint256", "uint256"], [proposalModelsData.changeInvestmentsManagerTokensToETHList.maxTokens, toDecimals(proposalModelsData.changeInvestmentsManagerTokensToETHList.maxPercentagePerToken / 100, 18)])
        ],
        presetProposals : [],
        creationRules : VOID_ETHEREUM_ADDRESS,
        triggeringRules : VOID_ETHEREUM_ADDRESS,
        votingRulesIndex : 0,
        canTerminateAddresses : [proposalModelsData.changeInvestmentsManagerTokensToETHList.proposalRules.canTerminateAddresses],
        validatorsAddresses : [proposalModelsData.changeInvestmentsManagerTokensToETHList.proposalRules.validatorsAddresses],
        creationData : '0x',
        triggeringData : '0x',
        canTerminateData : [proposalModelsData.changeInvestmentsManagerTokensToETHList.proposalRules.canTerminateData],
        validatorsData : [proposalModelsData.changeInvestmentsManagerTokensToETHList.proposalRules.validatorsData]
    }];

    if(proposalModelsData.fixedInflation) {
        subDAOProposalModels = [...subDAOProposalModels, {
            source: VOID_ETHEREUM_ADDRESS,
            uri : '',
            isPreset : true,
            presetValues : proposalModelsData.fixedInflation.presetValues.map(it => abi.encode(["uint256"], [toDecimals(it / 100, 18)])),
            presetProposals : [],
            creationRules : VOID_ETHEREUM_ADDRESS,
            triggeringRules : VOID_ETHEREUM_ADDRESS,
            votingRulesIndex : 0,
            canTerminateAddresses : [proposalModelsData.fixedInflation.proposalRules.canTerminateAddresses],
            validatorsAddresses : [proposalModelsData.fixedInflation.proposalRules.validatorsAddresses],
            creationData : '0x',
            triggeringData : '0x',
            canTerminateData : [proposalModelsData.fixedInflation.proposalRules.canTerminateData],
            validatorsData : [proposalModelsData.fixedInflation.proposalRules.validatorsData]
        }];
    }

    var type = 'tuple(address,string,bool,bytes[],bytes32[],address,address,uint256,address[][],address[][],bytes,bytes,bytes[][],bytes[][])[]';

    subDAOProposalModels = abi.encode([type], [subDAOProposalModels.map(Object.values)]);

    return subDAOProposalModels;
}