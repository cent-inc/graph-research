const express = require('express');
const mysql = require('mysql2/promise');
const jaccard = require('jaccard');

const jsonResponse = (res, error, results) => {
  if (error) {
    res.status(500);
    res.set('content-type', 'application/json');
    res.send({
      errors: [error.toString()]
    });
  }
  else {
    res.status(200);
    res.set('content-type', 'application/json');
    res.send(JSON.stringify({
      results: results
    }));
  }
};

const repeat = (template, occurences) => `,${template}`.repeat(occurences).slice(1);

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  database: 'graph',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0 // No limit
});

const app = express();

app.get('/', (req, res) => res.send('hello world'));
app.get('/:address', async (req, res) => {
  const address = req.params.address;
  const [collections] = await pool.query(
    `SELECT * FROM collection_owner WHERE owner = ?`,
    [ address ]
  );
  userSet = collections.map(c => c.nft_name);
  if (userSet.length > 0) {
    const [othersCollections] = await pool.query(
      `
      SELECT nft_name, owner
      FROM collection_owner
      WHERE owner NOT IN ('0x0000000000000000000000000000000000000000', ?) AND nft_name IN (${repeat('?', userSet.length)})
      `,
      [ address ].concat(userSet)
    );
    const ocMap = {};
    othersCollections.forEach(c => {
      if (!ocMap[c.owner]) {
        ocMap[c.owner] = [];
      }
      ocMap[c.owner].push(c.nft_name);
    });
    const scores = []
    Object.keys(ocMap).forEach(address => {
      scores.push({
        a: address,
        s: jaccard.index(userSet, ocMap[address]).toFixed(3)
      });
    });
    delete ocMap;
    const ranked = scores.sort((a, b) => a.s < b.s ? 1 : -1);
    jsonResponse(res, null, {
      collections: userSet,
      jaccardRank: ranked.slice(0, 250)
    });
  }
  else {
    jsonResponse(res, null, 'NO MATCHES');
  }
});

const port = 3030;
app.listen(port, () => console.log(`App listening on ${port}`));
