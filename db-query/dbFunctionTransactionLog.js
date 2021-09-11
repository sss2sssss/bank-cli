let dbQuery = require("./dbQuery");
let timeUtil = require("../utils/time");

const createTableString = 'CREATE TABLE IF NOT EXISTS transactionLog(id INTEGER PRIMARY KEY, performUserId INTEGER NOT NULL, event TEXT NOT NULL, transactionTimestamp TEXT NOT NULL)';

function insertLog(performUserId, event)
{
    return new Promise(function(resolve, reject){
        let sql = `INSERT INTO transactionLog (performUserId, event, transactionTimestamp)
        VALUES (?, ?, ?)`;

        dbQuery.createOrGetDbConnection()
        .then((db) => {
            db.serialize(() => {
                db.run(createTableString)
                    .run(sql, [performUserId, event, timeUtil.getCurrentTime()], (err) => {
                        if (err) {
                            db.close();
                            reject(err.message);
                        }
                        else
                        {
                            resolve(true);
                            db.close();
                        }
                    });
              });
        })
        .catch((err) => {
            reject(err);
        });
    });
}

function getLatestHistoryTransactions(userId, limit)
{
    return new Promise(function(resolve, reject){
        let sql = `SELECT event, transactionTimestamp
        FROM transactionLog
        WHERE performUserId  = ? ORDER BY id DESC LIMIT ?`;

        dbQuery.createOrGetDbConnection()
        .then((db) => {
            db.serialize(() => {
                db.run(createTableString)
                    .all(sql, [userId, limit], (err, row) => {
                        if (err) {
                            db.close();
                            reject(err.message);
                        }
                        else
                        {
                            resolve(row);
                            db.close();
                        }
                    });
              });
        })
        .catch((err) => {
            reject(err);
        });
    });
}

module.exports.insertLog = insertLog;
module.exports.getLatestHistoryTransactions = getLatestHistoryTransactions;