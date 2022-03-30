`npm install`

-> install dependencies

`npm run start`

-> start local jaccard-scoring server

You can then lookup any address's score at http://localhost:3030/0xaddress. The top 250 matches will be returned.

Make sure to set up the data first, as outlined below:

# Setting up the data

## Grab the source repo

https://github.com/dOrgTech/cent-social-index

## From db folder containing the sqlite database

`sqlite3 -header -csv cent.dev.sqlite "select * from events;" > out.csv`

Then using mysql (these steps may take some time):

```
mysql -u root

CREATE DATABASE graph;

USE graph;

CREATE TABLE events (
    id              INT PRIMARY KEY,
    block_number    INT,
    nft_name        VARCHAR(100),
    txn_hash        VARCHAR(66),
    txn_type        VARCHAR(10),
    gas             BIGINT UNSIGNED,
    value           VARCHAR(78),
    from_hash       VARCHAR(42),
    to_hash         VARCHAR(42),
    token_id        VARCHAR(78),
    timestamp       DATETIME,
    createdAt       DATETIME,
    updatedAt       DATETIME
);

LOAD DATA LOCAL INFILE 'out.csv' INTO TABLE events FIELDS TERMINATED BY ',' ENCLOSED BY '"' IGNORE 1 ROWS;

CREATE INDEX sender ON events (from_hash);
CREATE INDEX recipient ON events (to_hash);
CREATE INDEX contract ON events (nft_name);
CREATE INDEX members ON events (nft_name, to_hash);

CREATE TABLE collection_owner (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nft_name        VARCHAR(100),
    owner           VARCHAR(42)
);

INSERT INTO collection_owner (nft_name, owner)
SELECT DISTINCT nft_name, to_hash 
FROM events;

CREATE INDEX c_o_name ON collection_owner (nft_name);
CREATE INDEX c_o_owner ON collection_owner (owner);
```


