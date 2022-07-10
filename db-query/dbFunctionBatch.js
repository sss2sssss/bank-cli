let dbFunction = require('./dbFunction');

// process debt transaction payout for topup
async function processOwnToTransactionBatch(ownToResult, amountInFloat, index, usrId, usrName)
{
    try {
        let ownToName = await dbFunction.dbUser.getUsrName(ownToResult[index].toUserId)
        let ownAmountInFloat = parseFloat(parseFloat(ownToResult[index].debtAmount).toFixed(2));
        if (amountInFloat <= ownAmountInFloat)
        {
            let newAmount = (ownAmountInFloat - amountInFloat).toFixed(2);
            if (amountInFloat == ownAmountInFloat)
            {
                newAmount = "0.00";
            }
            await dbFunction.dbDebtTransaction.updateDebtTransaction(ownToResult[index].id, usrId, ownToResult[index].toUserId, newAmount)
            let value = await dbFunction.dbUser.getUsrAvailableAmount(ownToResult[index].toUserId)
            let remainingAmountInFloat = parseFloat(parseFloat(value).toFixed(2));
            let newAmountAvailable = (remainingAmountInFloat + amountInFloat).toFixed(2);
            await dbFunction.dbUser.setUsrAvailableAmount(ownToResult[index].toUserId, newAmountAvailable)
            await dbFunction.dbTransactionLog.insertLog(usrId, "Transferred " + amountInFloat.toFixed(2) + " to " + ownToName + ".");
            try {
                await dbFunction.dbTransactionLog.insertLog(ownToResult[index].toUserId, "Received " + amountInFloat.toFixed(2) + " from " + usrName  + ".")
                console.log("Transferred " + amountInFloat.toFixed(2) + " to " + ownToName + ".");
                console.log("Your balance is 0.00.");
                console.log("Owing " + newAmount + " to " + ownToName + ".");
                process.exit(1);
            } catch (err) {
                console.log("Transferred " + amountInFloat.toFixed(2) + " to " + ownToName + ".");
                console.log("Your balance is 0.00.");
                console.log("Owing " + newAmount + " to " + ownToName + ".");
                process.exit(1);
            }
        }
        else
        {
            let newAmount = amountInFloat - ownAmountInFloat;
            await dbFunction.dbDebtTransaction.updateDebtTransaction(ownToResult[index].id, usrId, ownToResult[index].toUserId, "0.00")
            let value = await dbFunction.dbUser.getUsrAvailableAmount(ownToResult[index].toUserId)
            let remainingAmountInFloat = parseFloat(parseFloat(value).toFixed(2));
            let newAmountAvailable = (remainingAmountInFloat + ownAmountInFloat).toFixed(2);
            await dbFunction.dbUser.setUsrAvailableAmount(ownToResult[index].toUserId, newAmountAvailable)
            await dbFunction.dbTransactionLog.insertLog(usrId, "Transferred " + ownAmountInFloat.toFixed(2) + " to " + ownToName + ".");
            await dbFunction.dbTransactionLog.insertLog(ownToResult[index].toUserId, "Received " + ownAmountInFloat.toFixed(2) + " from " + usrName  + ".");
            console.log("Transferred " + ownAmountInFloat.toFixed(2) + " to " + ownToName + ".");
            if (index == (ownToResult.length - 1))
            {
                // save your own remaining
                let value = await dbFunction.dbUser.getUsrAvailableAmount(usrId)
                let remainingAmountInFloat = parseFloat(parseFloat(value).toFixed(2));
                let newAmountAvailable = (remainingAmountInFloat + newAmount).toFixed(2);
                await dbFunction.dbUser.setUsrAvailableAmount(usrId, newAmountAvailable)
                try {
                    await dbFunction.dbTransactionLog.insertLog(usrId, "Top up " + newAmount.toFixed(2) + ".")
                    console.log("Your balance is "+ newAmountAvailable + ".");
                    process.exit(1);
                } catch (err) {
                    console.log("Your balance is "+ newAmountAvailable + ".");
                    process.exit(1);
                }
            }
            else
            {
                processOwnToTransactionBatch(ownToResult, newAmount, index + 1, usrId, usrName);
            }
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

// To print own from, remaining amount, own to from login user
async function processLoginLogReportBatch(usrIndex)
{
    // Show own from somebody record
    try {
        let ownFromResult = await dbFunction.dbDebtTransaction.getOwnFromTransaction(usrIndex)
        if (ownFromResult.length > 0)
        {
            processOwnFromLoginReport(ownFromResult, usrIndex, 0);
        }
        else
        {
            processUsrAvailableLoginReport(usrIndex);
        }
    } catch (err) { }
}

// To print own from login user
async function processOwnFromLoginReport(ownFromResult, usrIndex, startIndex)
{
    try {
        let ownFromName = await dbFunction.dbUser.getUsrName(ownFromResult[startIndex].performUserId)
        console.log("Owing " + ownFromResult[startIndex].debtAmount  + " from "+ ownFromName +".")
        if (startIndex == (ownFromResult.length - 1))
        {
            processUsrAvailableLoginReport(usrIndex);
        }
        else
        {
            processOwnFromLoginReport(ownFromResult, usrIndex, startIndex + 1);
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

// To print remaining amount from login user
async function processUsrAvailableLoginReport(usrIndex)
{
    // get current amount
    try {
        let value = await dbFunction.dbUser.getUsrAvailableAmount(usrIndex)
        console.log("Your balance is "+ value + ".");
        // Show own to somebody record
        let ownToResult = await dbFunction.dbDebtTransaction.getOwnToTransaction(usrIndex)
        if (ownToResult.length > 0)
        {
            processOwnToLoginReport(ownToResult, usrIndex, 0);
        }
        else
        {
            process.exit(1);
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

// To print own to login user
async function processOwnToLoginReport(ownToResult, usrIndex, startIndex)
{
    try {
        let ownToName = await dbFunction.dbUser.getUsrName(ownToResult[startIndex].toUserId)
        console.log("Owing " + ownToResult[startIndex].debtAmount  + " to "+ ownToName +".")
        if (startIndex == (ownToResult.length - 1))
        {
            process.exit(1);
        }
        else
        {
            processOwnToLoginReport(ownToResult, usrIndex, startIndex + 1);
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

module.exports.processOwnToTransactionBatch = processOwnToTransactionBatch;
module.exports.processLoginLogReportBatch = processLoginLogReportBatch;