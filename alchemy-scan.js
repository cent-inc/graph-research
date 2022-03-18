const { createAlchemyWeb3 } = require('@alch/alchemy-web3');
const web3 = createAlchemyWeb3('https://eth-mainnet.alchemyapi.io/v2/s2JeBN6N9XdRi-F-fT49GpZ5mM-ooiyu'); // API key is on "Growth" plan

const zeroTokenId = '0x0000000000000000000000000000000000000000000000000000000000000000';
const startTime = (new Date().getTime()) / 1000;
let totalTokenTransfers = 0;
let scannedBlockHeight = 0;
let apiCalls = 0;
let pageKey = undefined;
(async () => {
    while (true) {
        ++apiCalls;
        const results = await web3.alchemy.getAssetTransfers({
            "fromBlock": "0x0",
            "toBlock": "latest",
            "excludeZeroValue": false,
            "category": [
                "erc721"
            ],
            pageKey
        });

        const transfers = results.transfers.filter(t => t.tokenId != zeroTokenId);
        if (transfers.length > 0) {
            totalTokenTransfers += transfers.length;
            scannedBlockHeight = parseInt(transfers[transfers.length - 1].blockNum, 16);
        }
        console.log(`XFERS: ${totalTokenTransfers}\t\tBLOCKS:${scannedBlockHeight}\t\tCALLS:${apiCalls}`);

        pageKey = results.pageKey;
        if (!pageKey) {
            const endTime = (new Date().getTime()) / 1000;
            console.log(`Finished in ${endTime - startTime} seconds`);
            break;
        }
    }
})();

// This just keeps node running.
const wait = () => setTimeout(wait, 1000);
wait();

