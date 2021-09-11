let dbQuery = require("./dbQuery");
let dbUser = require("./dbFunctionUser");
let dbTransactionLog = require("./dbFunctionTransactionLog");
let timeUtil = require("../utils/time");

const createTableString = 'CREATE TABLE IF NOT EXISTS debtTransaction(id INTEGER PRIMARY KEY, performUserId INTEGER NOT NULL, toUserId INTEGER NOT NULL, debtAmount TEXT NOT NULL, lastUpdateTimestamp TEXT NOT NULL)';

function getParticularDebtTransaction(performUserId, toUserId)
{
    return new Promise(function(resolve, reject){
        let sql = `SELECT id, debtAmount
        FROM debtTransaction
        WHERE performUserId  = ? AND toUserId = ?`;

        dbQuery.createOrGetDbConnection()
        .then((db) => {
            db.serialize(() => {
                db.run(createTableString)
                    .get(sql, [performUserId, toUserId], (err, row) => {
                        if (err) {
                            db.close();
                            reject(err.message);
                        }
                        else
                        {
                            if (row)
                            {
                                resolve({
                                    result: true,
                                    resultRow: row
                                });
                            }
                            else
                            {
                                resolve({
                                    result: false
                                });
                            }
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

function createDebtTransaction(performUserId, toUserId, debtAmount)
{
    return new Promise(function(resolve, reject){
        let sql = `INSERT INTO debtTransaction (performUserId, toUserId, debtAmount, lastUpdateTimestamp)
        VALUES (?, ?, ?, ?)`;

        dbQuery.createOrGetDbConnection()
        .then((db) => {
            db.serialize(() => {
                db.run(createTableString)
                    .run(sql, [performUserId, toUserId, debtAmount, timeUtil.getCurrentTime()], (err) => {
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

function updateDebtTransaction(transactionId, performUserId, toUserId, debtAmount)
{
    return new Promise(function(resolve, reject){
        let sql = `DELETE FROM debtTransaction where id = ?`;

        dbQuery.createOrGetDbConnection()
        .then((db) => {
            db.serialize(() => {
                db.run(createTableString)
                    .run(sql, transactionId, (err) => {
                        if (err) {
                            db.close();
                            reject(err.message);
                        }
                        else
                        {
                            db.close();
                            createDebtTransaction(performUserId, toUserId, debtAmount)
                            .then(() => {
                                resolve(true);
                            })
                            .catch((err) => {
                                reject(err);
                            });
                        }
                    });
              });
        })
        .catch((err) => {
            reject(err);
        });
    });
}

function getOwnToTransaction(userId)
{
    return new Promise(function(resolve, reject){
        let sql = `SELECT id, toUserId, debtAmount
        FROM debtTransaction
        WHERE performUserId  = ? AND (debtAmount != '0.00' AND debtAmount != '0')`;

        dbQuery.createOrGetDbConnection()
        .then((db) => {
            db.serialize(() => {
                db.run(createTableString)
                    .all(sql, [userId], (err, row) => {
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

function getOwnFromTransaction(userId)
{
    return new Promise(function(resolve, reject){
        let sql = `SELECT id, performUserId, debtAmount
        FROM debtTransaction
        WHERE toUserId  = ? AND (debtAmount != '0.00' AND debtAmount != '0')`;

        dbQuery.createOrGetDbConnection()
        .then((db) => {
            db.serialize(() => {
                db.run(createTableString)
                    .all(sql, [userId], (err, row) => {
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

module.exports.getParticularDebtTransaction = getParticularDebtTransaction;
module.exports.getOwnToTransaction = getOwnToTransaction;
module.exports.getOwnFromTransaction = getOwnFromTransaction;
module.exports.createDebtTransaction = createDebtTransaction;
module.exports.updateDebtTransaction = updateDebtTransaction;