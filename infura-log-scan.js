const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const ethers = require('ethers');
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

// This infura key gets 100k requests/day
const provider = new ethers.providers.StaticJsonRpcProvider(process.env.INFURA_HTTP_ENDPOINT, {
    name,
    chainId
});

(async () => {
    const startTime = (new Date().getTime()) / 1000;
    let apiCalls = 0;
    let nftTransferCount = 0;
    let startBlock = 0;
    let increment = 1000; // 1 million blocks;
    const currentBlock = await provider.getBlockNumber();
    while (startBlock < currentBlock) {
        try {
            const endBlock = Math.min(startBlock + increment, currentBlock);
            if (++apiCalls % 100000 == 0) {
                console.log('API Calls: ', apiCalls);
            }
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

            console.log('From block: ', startBlock, ' To Block: ', endBlock);
            startBlock = endBlock + 1;
            increment = Math.floor(increment + (increment / 10)); // Increase range by 10% on successful scan
            const nftTransfers = logs.filter(l => l.topics.length == 4);
            console.log('New transfer events (including ERC20 transfers): ', logs.length);
            console.log('New ERC721 transfer events', nftTransfers.length);
            nftTransferCount += nftTransfers.length;
        }
        catch (e) {
            const newIncrement = Math.ceil(increment / 2); // Decrease range by 50% on failed scan
            console.log('Interval too high, halving range to: ', newIncrement, startBlock);
            increment = newIncrement;
        }
    }
    const endTime = (new Date().getTime()) / 1000;
    console.log(`Done Scanning chain in ${endTime - startTime} seconds. Found ${nftTransferCount} transfers in ${apiCalls} API calls.`);
})()

// This just keeps node running.
const wait = () => setTimeout(wait, 1000);
wait();
