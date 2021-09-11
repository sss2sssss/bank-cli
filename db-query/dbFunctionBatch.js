let dbFunction = require('./dbFunction');

// process debt transaction payout for topup
function processOwnToTransactionBatch(ownToResult, amountInFloat, index, usrId, usrName)
{
     dbFunction.dbUser.getUsrName(ownToResult[index].toUserId)
    .then((ownToName) => {
        var ownAmountInFloat = parseFloat(parseFloat(ownToResult[index].debtAmount).toFixed(2));
        if (amountInFloat <= ownAmountInFloat)
        {
            var newAmount = (ownAmountInFloat - amountInFloat).toFixed(2);
            if (amountInFloat == ownAmountInFloat)
            {
                newAmount = "0.00";
            }
            dbFunction.dbDebtTransaction.updateDebtTransaction(ownToResult[index].id, usrId, ownToResult[index].toUserId, newAmount)
            .then(() => {
                dbFunction.dbUser.getUsrAvailableAmount(ownToResult[index].toUserId)
                .then((value) => {
                    var remainingAmountInFloat = parseFloat(parseFloat(value).toFixed(2));
                    var newAmountAvailable = (remainingAmountInFloat + amountInFloat).toFixed(2);
                    dbFunction.dbUser.setUsrAvailableAmount(ownToResult[index].toUserId, newAmountAvailable)
                    .then(() => {
                        dbFunction.dbTransactionLog.insertLog(usrId, "Transferred " + amountInFloat.toFixed(2) + " to " + ownToName + ".");
                        dbFunction.dbTransactionLog.insertLog(ownToResult[index].toUserId, "Received " + amountInFloat.toFixed(2) + " from " + usrName  + ".")
                        .then(() => {
                            console.log("Transferred " + amountInFloat.toFixed(2) + " to " + ownToName + ".");
                            console.log("Your balance is 0.00.");
                            console.log("Owing " + newAmount + " to " + ownToName + ".");
                            process.exit(1);
                        })
                        .catch((err) => {
                            console.log("Transferred " + amountInFloat.toFixed(2) + " to " + ownToName + ".");
                            console.log("Your balance is 0.00.");
                            console.log("Owing " + newAmount + " to " + ownToName + ".");
                            process.exit(1);
                        });
                    })
                    .catch((err) => {
                        console.error(err);
                        process.exit(1);
                    });
                })
                .catch((err) => {
                    console.error(err);
                    process.exit(1);
                });
            })
            .catch((err) => {
                console.error(err);
                process.exit(1);
            });
        }
        else
        {
            let newAmount = amountInFloat - ownAmountInFloat;
            dbFunction.dbDebtTransaction.updateDebtTransaction(ownToResult[index].id, usrId, ownToResult[index].toUserId, "0.00")
            .then(() => {
                dbFunction.dbUser.getUsrAvailableAmount(ownToResult[index].toUserId)
                .then((value) => {
                    var remainingAmountInFloat = parseFloat(parseFloat(value).toFixed(2));
                    var newAmountAvailable = (remainingAmountInFloat + ownAmountInFloat).toFixed(2);
                    dbFunction.dbUser.setUsrAvailableAmount(ownToResult[index].toUserId, newAmountAvailable)
                    .then(() => {
                        dbFunction.dbTransactionLog.insertLog(usrId, "Transferred " + ownAmountInFloat.toFixed(2) + " to " + ownToName + ".");
                        dbFunction.dbTransactionLog.insertLog(ownToResult[index].toUserId, "Received " + ownAmountInFloat.toFixed(2) + " from " + usrName  + ".");
                        console.log("Transferred " + ownAmountInFloat.toFixed(2) + " to " + ownToName + ".");
                        if (index == (ownToResult.length - 1))
                        {
                            // save your own remaining
                            dbFunction.dbUser.getUsrAvailableAmount(usrId)
                            .then((value) => {
                                var remainingAmountInFloat = parseFloat(parseFloat(value).toFixed(2));
                                var newAmountAvailable = (remainingAmountInFloat + newAmount).toFixed(2);
                                dbFunction.dbUser.setUsrAvailableAmount(usrId, newAmountAvailable)
                                .then(() => {
                                    dbFunction.dbTransactionLog.insertLog(usrId, "Top up " + newAmount.toFixed(2) + ".")
                                    .then(() => {
                                        console.log("Your balance is "+ newAmountAvailable + ".");
                                        process.exit(1);
                                    })
                                    .catch((err) => {
                                        console.log("Your balance is "+ newAmountAvailable + ".");
                                        process.exit(1);
                                    });
                                })
                                .catch((err) => {
                                    console.error(err);
                                    process.exit(1);
                                });
                            })
                            .catch((err) => {
                                console.error(err);
                                process.exit(1);
                            });
                        }
                        else
                        {
                            processOwnToTransactionBatch(ownToResult, newAmount, index + 1, usrId, usrName);
                        }
                    })
                    .catch((err) => {
                        console.error(err);
                        process.exit(1);
                    });
                })
                .catch((err) => {
                    console.error(err);
                    process.exit(1);
                });
            })
            .catch((err) => {
                console.error(err);
                process.exit(1);
            });
        }
    })
    .catch(() => {
        console.error(err);
        process.exit(1);
    });
}

// To print own from, remaining amount, own to from login user
function processLoginLogReportBatch(usrIndex)
{
    // Show own from somebody record
    dbFunction.dbDebtTransaction.getOwnFromTransaction(usrIndex)
    .then((ownFromResult) => {
        if (ownFromResult.length > 0)
        {
            processOwnFromLoginReport(ownFromResult, usrIndex, 0);
        }
        else
        {
            processUsrAvailableLoginReport(usrIndex);
        }
    })
    .catch((err) => {
    });
}

// To print own from login user
function processOwnFromLoginReport(ownFromResult, usrIndex, startIndex)
{
    dbFunction.dbUser.getUsrName(ownFromResult[startIndex].performUserId)
    .then((ownFromName) => {
        console.log("Owing " + ownFromResult[startIndex].debtAmount  + " from "+ ownFromName +".")
        if (startIndex == (ownFromResult.length - 1))
        {
            processUsrAvailableLoginReport(usrIndex);
        }
        else
        {
            processOwnFromLoginReport(ownFromResult, usrIndex, startIndex + 1);
        }
    })
    .catch(() => {
        console.error(err);
        process.exit(1);
    });
}

// To print remaining amount from login user
function processUsrAvailableLoginReport(usrIndex)
{
    // get current amount
    dbFunction.dbUser.getUsrAvailableAmount(usrIndex)
    .then((value) => {
        console.log("Your balance is "+ value + ".");
        // Show own to somebody record
        dbFunction.dbDebtTransaction.getOwnToTransaction(usrIndex)
        .then((ownToResult) => {
            if (ownToResult.length > 0)
            {
                processOwnToLoginReport(ownToResult, usrIndex, 0);
            }
            else
            {
                process.exit(1);
            }
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

// To print own to login user
function processOwnToLoginReport(ownToResult, usrIndex, startIndex)
{
    dbFunction.dbUser.getUsrName(ownToResult[startIndex].toUserId)
    .then((ownToName) => {
        console.log("Owing " + ownToResult[startIndex].debtAmount  + " to "+ ownToName +".")
        if (startIndex == (ownToResult.length - 1))
        {
            process.exit(1);
        }
        else
        {
            processOwnToLoginReport(ownToResult, usrIndex, startIndex + 1);
        }
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

module.exports.processOwnToTransactionBatch = processOwnToTransactionBatch;
module.exports.processLoginLogReportBatch = processLoginLogReportBatch;