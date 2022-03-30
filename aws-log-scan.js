const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const ethers = require('ethers');
const AWSHttpProvider = require('./aws-http-provider.js');
const erc721Interface = new ethers.utils.Interface([
    'event Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId)',
    'event Approval(address indexed _owner, address indexed _approved, uint256 indexed _tokenId)',
    'event ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved)',
    'function balanceOf(address _owner) external view returns (uint256)',
    'function ownerOf(uint256 _tokenId) external view returns (address)',
    'function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes data) external payable',
    'function safeTransferFrom(address _from, address _to, uint256 _tokenId) external payable',
    'function transferFrom(address _from, address _to, uint256 _tokenId) external payable',
    'function approve(address _approved, uint256 _tokenId) external payable',
    'function setApprovalForAll(address _operator, bool _approved) external',
    'function getApproved(uint256 _tokenId) external view returns (address)',
    'function isApprovedForAll(address _owner, address _operator) external view returns (bool)'
]);

const chainId = 1; // Ethereum network id
const name = 'Ethereum';


console.log(process.env.AMB_HTTP_ENDPOINT,
process.env.AWS_ACCESS_KEY_ID,
process.env.AWS_SECRET_ACCESS_KEY);

const provider = new ethers.providers.Web3Provider(new AWSHttpProvider(process.env.AMB_HTTP_ENDPOINT, {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
}));

(async () => {
    const startTime = (new Date().getTime()) / 1000;
    let apiCalls = 0;
    let nftTransferCount = 0;
    let startBlock = 13000000;
    let increment = 100;
    const currentBlock = 14000000;
    // const currentBlock = await provider.getBlockNumber();
    while (startBlock < currentBlock) {
        try {
            const endBlock = Math.min(startBlock + increment, currentBlock);
            console.log('SCAN: ', startBlock, '\tTO: ', endBlock, '\tBLOCKS:', endBlock - startBlock, '\t@', new Date().toISOString());
            const logs = await provider.getLogs({
                topics: [
                    erc721Interface.getEventTopic('Transfer(address indexed, address indexed, uint256 indexed)'),
                    null,
                    null,
                    null
                ],
                fromBlock: startBlock,
                toBlock: endBlock
            });

            startBlock = endBlock + 1;
            increment = Math.min(10000, Math.floor((1.1 * increment)));
            const nftTransfers = logs.filter(l => l.topics.length == 4);
            nftTransferCount += nftTransfers.length;
            console.log('XFERS (721): ', nftTransfers.length);
            console.log('XFERS (SUM): ', nftTransferCount);
        }
        catch (e) {
            console.log(e.message);
            const newIncrement = Math.ceil(increment / 2); // Decrease range by 50% on failed scan
            console.log('ERROR, HALVING RANGE TO: ', newIncrement);
            increment = newIncrement;
        }
    }
    const endTime = (new Date().getTime()) / 1000;
    console.log(`TIME: ${endTime - startTime}s\tXFERS: ${nftTransferCount}`);
})()

// This just keeps node running.
const wait = () => setTimeout(wait, 1000);
wait();
