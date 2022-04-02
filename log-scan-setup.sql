CREATE DATABASE nft_graph;

USE nft_graph;

CREATE TABLE nft_transfer (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    contract_address    VARCHAR(42),
    from_address        VARCHAR(42),
    to_address          VARCHAR(42),
    token_id            VARCHAR(78),
    token_quantity      VARCHAR(78),
    txn_hash            VARCHAR(66),
    is_1155             BOOL,
    block_number        INT,
    block_log_index     INT,

    UNIQUE KEY (block_number, block_log_index)
);

CREATE INDEX sender ON nft_transfer (from_address);
CREATE INDEX recipient ON nft_transfer (to_address);
CREATE INDEX contract_address ON nft_transfer (contract_address);
CREATE INDEX contract_member ON nft_transfer (contract_address, to_address);
