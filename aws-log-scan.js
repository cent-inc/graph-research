const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const mysql = require('mysql2/promise');
const ethers = require('ethers');
const AWSHttpProvider = require('./aws-http-provider.js');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  database: 'nft_graph',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0 // No limit
});
const repeat = (template, occurences) => `,${template}`.repeat(occurences).slice(1);

const provider = new ethers.providers.Web3Provider(new AWSHttpProvider(process.env.AMB_HTTP_ENDPOINT, {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
}));

const transferEvents = new ethers.utils.Interface([
    'event Transfer(address indexed _from, address indexed _to, uint256 _tokenId)',
    'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
    'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)'
]);


// ERC20 & ERC721 (721 has last topic indexed, but signature is the same)
const ERC20_721 = transferEvents.getEventTopic('Transfer(address indexed, address indexed, uint256 indexed)');
const ERC1155_SINGLE = transferEvents.getEventTopic('TransferSingle(address indexed, address indexed, address indexed, uint256, uint256)');
const ERC1155_BATCH = transferEvents.getEventTopic('TransferBatch(address indexed, address indexed, address indexed, uint256[], uint256[])');

(async () => {
    const startTime = (new Date().getTime()) / 1000;
    let apiCalls = 0;
    let startBlock = 0;
    let increment = 500000;
    // const currentBlock = 14000000;
    const currentBlock = await provider.getBlockNumber();
    while (startBlock < currentBlock) {
        try {
            const endBlock = Math.min(startBlock + increment, currentBlock);
            console.log('SCAN: ', startBlock, '\tTO: ', endBlock, '\tBLOCKS:', endBlock - startBlock, '\t@', new Date().toISOString());
            const logs = await provider.getLogs({
                topics: [
                    [
                        ERC20_721,
                        ERC1155_BATCH,
                        ERC1155_SINGLE
                    ],
                    null,
                    null,
                    null // In some versions of geth, the presence of this last topic (even as null) filters out erc20 events which aren't indexed
                ],
                fromBlock: startBlock,
                toBlock: endBlock
            });
            apiCalls++;
            const transfers = [];
            let counter = 0;
            logs.forEach(l => {
                const sig = l.topics[0];
                if (sig == ERC20_721 && l.topics.length == 4) {
                    transfers.push(
                        l.address,
                        '0x' + l.topics[1].slice(-40),
                        '0x' + l.topics[2].slice(-40),
                        ethers.BigNumber.from(l.topics[3], 'hex').toString(),
                        1,
                        l.transactionHash,
                        false,
                        l.blockNumber,
                        l.logIndex
                    );
                    ++counter;
                }
                else if (sig == ERC1155_BATCH) {
                    const [ids, quantities] = ethers.utils.defaultAbiCoder.decode([ 'uint256[]', 'uint256[]' ], l.data);
                    ids.forEach((id, i) => {
                        transfers.push(
                            l.address,
                            '0x' + l.topics[2].slice(-40),
                            '0x' + l.topics[3].slice(-40),
                            ethers.BigNumber.from(id.toString(), 'hex').toString(),
                            ethers.BigNumber.from(quantities[i].toString(), 'hex').toString(),
                            l.transactionHash,
                            true,
                            l.blockNumber,
                            l.logIndex
                        );
                        ++counter;
                    });
                }
                else if (sig == ERC1155_SINGLE) {
                    const [id, quantity] = ethers.utils.defaultAbiCoder.decode([ 'uint256', 'uint256' ], l.data);
                    transfers.push(
                        l.address,
                        '0x' + l.topics[2].slice(-40),
                        '0x' + l.topics[3].slice(-40),
                        ethers.BigNumber.from(id.toString(), 'hex').toString(),
                        ethers.BigNumber.from(quantity.toString(), 'hex').toString(),
                        l.transactionHash,
                        true,
                        l.blockNumber,
                        l.logIndex
                    );
                    ++counter;
                }
            });
            console.log('NEW EVENTS: ', counter);
            if (counter > 0) {
                pool.query(
                    `
                    INSERT INTO nft_transfer (
                        contract_address,
                        from_address,
                        to_address,
                        token_id,
                        token_quantity,
                        txn_hash,
                        is_1155,
                        block_number,
                        block_log_index
                    ) VALUES ${repeat('(?,?,?,?,?,?,?,?,?)', counter)}
                    ON DUPLICATE KEY UPDATE is_1155 = VALUES(is_1155)
                    `,
                    transfers
                );
            }
            startBlock = endBlock + 1;
            increment++; // Additive increase
        }
        catch (e) {
            console.log(e.message);
            const newIncrement = Math.ceil(increment / 2); // Decrease range by 50% on failed scan
            console.log('ERROR, HALVING RANGE TO: ', newIncrement);
            increment = newIncrement;
        }
    }
    const endTime = (new Date().getTime()) / 1000;
    console.log(`DONE IN ${endTime - startTime}s AND ${apiCalls} CALLS`);
})()

const wait = () => setTimeout(wait, 1000);
wait();
