const sqlite3 = require('sqlite3').verbose();

function createOrGetDbConnection()
{
  return new Promise(function(resolve, reject){
    let db = new sqlite3.Database('bank.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE , (err) => {
      if (err) {
        reject(err.message);
      }
      else
      {
        resolve(db);
      }
    });
  });
}

module.exports.createOrGetDbConnection = createOrGetDbConnection;