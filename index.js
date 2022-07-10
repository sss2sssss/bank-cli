#!/usr/bin/env node

const program = require('commander');
let dbFunction = require('./db-query/dbFunction');
let dbFunctionBatch = require('./db-query/dbFunctionBatch');
let passwordRegex = new RegExp("^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{8,}$");
let amountRegex = new RegExp("^[0-9]+(\.[0-9]{1,2})?$");


program
    .name('bank')
    .version('1.0.0')
    .description('An bank cli to topup and pay between users')

// Login user with password
// $ bank login <name> <password> [-f]
// name - username, required
// password - user password, at least 8 characters with one uppercase, one lowercase and one number
program
    .command('login <name> <password>') // sub-command name
    .description('Perform login with name and password') // command description
    // function to execute when command is uses
    .action(async function () {
        let forceLogout = false;
        let name = "";
        let password = "";

        name = program.args[1];
        password = program.args[2];
        if (program.args.length == 4)
        {
            forceLogout = true;
        }
        if (password.length < 8)
        {
            console.error("Password length should need to have at least 8 character.");
            console.error("Which consists at least one character and one number.")
            process.exit(1);
        }
        else if (!passwordRegex.test(password))
        {
            console.error("Password doesn't contain at least one character and one number.");
            process.exit(1);
        }
        else
        {
            // Check if have existing user created
            try {
                let flag = await dbFunction.dbUser.checkUsrExists(name)
                if (flag)
                {
                    // force login
                    await dbFunction.dbUser.forceLogoutAndLogin(name, password)
                    let index = await dbFunction.dbUser.getUsrId(name)
                    console.log("Hello, " + name + "!");
                    // Batch generating login amount report
                    dbFunctionBatch.processLoginLogReportBatch(index);
                }
                else
                {
                    // force create user and login
                    await dbFunction.dbUser.forceLogoutAndCreateUsr(name, password)
                    console.log("Hello, " + name + "!");
                    console.log("Your balance is 0.00.");
                    process.exit(1);
                }
            } catch (err) {
                console.error(err);
                process.exit(1);
            }
        }
    });


// Topup current user amount
// $ bank topup <amount>
// amount - amount to topup, required
program
    .command('topup <amount>') // sub-command name
    .description('Perform topup with current user login') // command description
    // function to execute when command is uses
    .action(async function () {
        let amount = 0;
        amount = program.args[1];
        try
        {
            if (!amountRegex.test(amount) || amount.toString().indexOf(",") > -1)
            {
                console.error("Amount enter allowed only numeric and / or decimal with two decimal places.");
                process.exit(1);
            }
            else
            {
                let amountInFloat = parseFloat(parseFloat(amount).toFixed(2));
                if (amountInFloat <= 0.00)
                {
                    console.error("Amount enter need to be greater than 0.00.");
                    process.exit(1);
                }
                else
                {
                    try {
                        // Check if have existing user login
                        let usrSessionResult = await dbFunction.dbUser.checkUsrSessionLogin()
                        if (usrSessionResult.result)
                        {
                            let usrId = usrSessionResult.userId;
                            let usrName = usrSessionResult.userName;
                            try {
                                let ownToResult = await dbFunction.dbDebtTransaction.getOwnToTransaction(usrId)
                                if (ownToResult.length > 0)
                                {
                                    // process batch
                                    dbFunctionBatch.processOwnToTransactionBatch(ownToResult, amountInFloat, 0, usrId, usrName);
                                }
                                else
                                {
                                    // direct top up amount
                                    let value = await dbFunction.dbUser.getUsrAvailableAmount(usrId)
                                    let remainingAmountInFloat = parseFloat(parseFloat(value).toFixed(2));
                                    let newAmount = (remainingAmountInFloat + amountInFloat).toFixed(2);
                                    await dbFunction.dbUser.setUsrAvailableAmount(usrId, newAmount)
                                    try {
                                        await dbFunction.dbTransactionLog.insertLog(usrId, "Top up " + amountInFloat.toFixed(2) + ".")
                                        console.log("Your balance is "+ newAmount + ".");
                                        process.exit(1);
                                    } catch (err) {
                                        console.log("Your balance is "+ newAmount + ".");
                                        process.exit(1);
                                    }
                                }
                            } catch (err) {
                                console.error(err);
                                process.exit(1);
                            }
                        }
                        else
                        {
                            console.error("No user login at the moment.");
                            console.error("Please login to perform this command.");
                            process.exit(1);
                        }
                    } catch (err) {
                        console.error(err);
                        process.exit(1);
                    }
                }
            }
        }
        catch(err)
        {
            console.error("Error on processing amount.");
            process.exit(1);
        }
    });


// Pay to another user amount
// $ bank pay <user> <amount>
// user - user to targeted (cannot be ownself), required
// amount - amount to pay, required
program
    .command('pay <user> <amount>') // sub-command name
    .description('Perform topup with current user login') // command description
    // function to execute when command is uses
    .action(async function () {
        let payToUser = "";
        let amount = 0;
        payToUser = program.args[1];
        amount = program.args[2];
        try
        {
            if (!amountRegex.test(amount) || amount.toString().indexOf(",") > -1)
            {
                console.error("Amount enter allowed only numeric and / or decimal with two decimal places.");
                process.exit(1);
            }
            else
            {
                let amountInFloat = parseFloat(parseFloat(amount).toFixed(2));
                if (amountInFloat <= 0.00)
                {
                    console.error("Amount enter need to be greater than 0.00.");
                    process.exit(1);
                }
                else
                {
                    try {
                        // Check if have existing user login
                        let usrSessionResult = await dbFunction.dbUser.checkUsrSessionLogin()
                        if (usrSessionResult.result)
                        {
                            let usrId = usrSessionResult.userId;
                            let usrName = usrSessionResult.userName;
                            if (usrName == payToUser)
                            {
                                console.error("Pay function cannot be use on same user.");
                                console.error("Please type another username to perform this command.");
                                process.exit(1);
                            }
                            else
                            {
                                try {
                                    let payToUserId = await dbFunction.dbUser.getUsrId(payToUser)
                                    try {
                                        let transactionResult = await dbFunction.dbDebtTransaction.getParticularDebtTransaction(payToUserId, usrId)
                                        let debtId = -1;
                                        let debtAmountInFloat = 0.00;
                                        if (transactionResult.result)
                                        {
                                            debtId = transactionResult.resultRow.id;
                                            debtAmountInFloat = parseFloat(parseFloat(transactionResult.resultRow.debtAmount).toFixed(2));
                                        }

                                        // get user available amount
                                        let value = await dbFunction.dbUser.getUsrAvailableAmount(usrId)
                                        let remainingAmountInFloat = parseFloat(parseFloat(value).toFixed(2));
                                        // If there's not debt transaction or there is and debt amount is 0
                                        if (debtId <= -1 || (debtId > -1 && debtAmountInFloat == 0.00))
                                        {
                                            // If have remaining amount, allow to pay
                                            if (remainingAmountInFloat > 0.00)
                                            {
                                                // If user still can pay full amount
                                                if (remainingAmountInFloat > amountInFloat)
                                                {
                                                    let newAmountFrom = (remainingAmountInFloat - amountInFloat).toFixed(2);
                                                    // Get pay to user available amount
                                                    let payToUserAvailableValue = await dbFunction.dbUser.getUsrAvailableAmount(payToUserId)
                                                    let remainingPayToAmountInFloat = parseFloat(parseFloat(payToUserAvailableValue).toFixed(2));
                                                    let newAmountPayTo = (remainingPayToAmountInFloat + amountInFloat).toFixed(2);
                                                    await dbFunction.dbUser.setUsrAvailableAmount(payToUserId, newAmountPayTo)
                                                    await dbFunction.dbTransactionLog.insertLog(usrId, "Transferred " + amountInFloat.toFixed(2) + " to " + payToUser + ".");
                                                    await dbFunction.dbTransactionLog.insertLog(payToUserId, "Received " + amountInFloat.toFixed(2) + " from " + usrName + ".");
                                                    console.log("Transferred " + amountInFloat.toFixed(2) + " to " + payToUser + ".");
                                                    await dbFunction.dbUser.setUsrAvailableAmount(usrId, newAmountFrom)
                                                    console.log("Your balance is "+ newAmountFrom + ".");
                                                    process.exit(1);
                                                }
                                                // If user cannot pay full amount and need to log debt to that user
                                                else
                                                {
                                                    let newDebtAmountToPayUser = (amountInFloat - remainingAmountInFloat).toFixed(2);
                                                    // Get pay to user available amount
                                                    let payToUserAvailableValue = await dbFunction.dbUser.getUsrAvailableAmount(payToUserId)
                                                    let remainingPayToAmountInFloat = parseFloat(parseFloat(payToUserAvailableValue).toFixed(2));
                                                    let newAmountPayTo = (remainingPayToAmountInFloat + remainingAmountInFloat).toFixed(2);
                                                    await dbFunction.dbUser.setUsrAvailableAmount(payToUserId, newAmountPayTo)
                                                    await dbFunction.dbTransactionLog.insertLog(usrId, "Transferred " + remainingAmountInFloat.toFixed(2) + " to " + payToUser + ".");
                                                    await dbFunction.dbTransactionLog.insertLog(payToUserId, "Received " + remainingAmountInFloat.toFixed(2) + " from " + usrName + ".");
                                                    console.log("Transferred " + remainingAmountInFloat.toFixed(2) + " to " + payToUser + ".");
                                                    await dbFunction.dbUser.setUsrAvailableAmount(usrId, "0.00")
                                                    console.log("Your balance is 0.00.");
                                                    // To check whether you have debt to pay user before
                                                    let ownTransactionResult = await dbFunction.dbDebtTransaction.getParticularDebtTransaction(usrId, payToUserId)
                                                    let ownDebtId = -1;
                                                    if (ownTransactionResult.result)
                                                    {
                                                        ownDebtId = ownTransactionResult.resultRow.id;
                                                    }
                                                    if (ownDebtId <= -1)
                                                    {
                                                        // Create new debt
                                                        await dbFunction.dbDebtTransaction.createDebtTransaction(usrId, payToUserId, newDebtAmountToPayUser)
                                                        await dbFunction.dbTransactionLog.insertLog(usrId, "Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                        try {
                                                            await dbFunction.dbTransactionLog.insertLog(payToUserId, "Owing " + newDebtAmountToPayUser + " from " + usrName + ".")
                                                            console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                            process.exit(1);
                                                        } catch (err) {
                                                            console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                            process.exit(1);
                                                        }
                                                    }
                                                    else
                                                    {
                                                        // Update existing record to new value since is 0.00
                                                        await dbFunction.dbDebtTransaction.updateDebtTransaction(ownDebtId, usrId, payToUserId, newDebtAmountToPayUser)
                                                        await dbFunction.dbTransactionLog.insertLog(usrId, "Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                        try {
                                                            await dbFunction.dbTransactionLog.insertLog(payToUserId, "Owing " + newDebtAmountToPayUser + " from " + usrName + ".")
                                                            console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                            process.exit(1);
                                                        } catch (err) {
                                                            console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                            process.exit(1);
                                                        }
                                                    }
                                                }
                                            }
                                            // else if already 0, ask user to go topup
                                            else
                                            {
                                                console.error("Your balance is reached 0.00.");
                                                console.error("And your had no remaining debt from " + payToUser + ".");
                                                console.error("Please topup before perform this command.");
                                                process.exit(1);
                                            }
                                        }
                                        // there is any debt remaining
                                        else
                                        {
                                            // if debt can fully pay the amount type
                                            if (amountInFloat <= debtAmountInFloat)
                                            {
                                                let newDebtAmount = (debtAmountInFloat - amountInFloat).toFixed(2);
                                                // Update existing record to new value
                                                await dbFunction.dbDebtTransaction.updateDebtTransaction(debtId, payToUserId, usrId, newDebtAmount)
                                                await dbFunction.dbTransactionLog.insertLog(usrId, "Owing " + newDebtAmount + " from " + payToUser + ".");
                                                try {
                                                    await dbFunction.dbTransactionLog.insertLog(payToUserId, "Owing " + newDebtAmount + " to " + usrName + ".")
                                                    console.log("Owing " + newDebtAmount + " from " + payToUser + ".");
                                                    console.log("Your balance is " + remainingAmountInFloat.toFixed(2) + ".");
                                                    process.exit(1);
                                                } catch (err) {
                                                    console.log("Owing " + newDebtAmount + " from " + payToUser + ".");
                                                    console.log("Your balance is " + remainingAmountInFloat.toFixed(2) + ".");
                                                    process.exit(1);
                                                }
                                            }
                                            else
                                            {
                                                let newRemainingNeedToPayAmount = amountInFloat - debtAmountInFloat;
                                                // Update existing record to 0.00
                                                await dbFunction.dbDebtTransaction.updateDebtTransaction(debtId, payToUserId, usrId, "0.00")
                                                await dbFunction.dbTransactionLog.insertLog(usrId, "Owing 0.00 from " + payToUser + ".");
                                                await dbFunction.dbTransactionLog.insertLog(payToUserId, "Owing 0.00 to " + usrName + ".");
                                                console.log("Owing 0.00 from " + payToUser + ".");
                                                let value = await dbFunction.dbUser.getUsrAvailableAmount(usrId)
                                                let remainingAmountInFloat = parseFloat(parseFloat(value).toFixed(2));
                                                if (remainingAmountInFloat > 0.00)
                                                {
                                                    // If user still can pay full amount
                                                    if (remainingAmountInFloat > newRemainingNeedToPayAmount)
                                                    {
                                                        let newAmountFrom = (remainingAmountInFloat - newRemainingNeedToPayAmount).toFixed(2);
                                                        // Get pay to user available amount
                                                        let payToUserAvailableValue = await dbFunction.dbUser.getUsrAvailableAmount(payToUserId)
                                                        let remainingPayToAmountInFloat = parseFloat(parseFloat(payToUserAvailableValue).toFixed(2));
                                                        let newAmountPayTo = (remainingPayToAmountInFloat + newRemainingNeedToPayAmount).toFixed(2);
                                                        await dbFunction.dbUser.setUsrAvailableAmount(payToUserId, newAmountPayTo)
                                                        await dbFunction.dbTransactionLog.insertLog(usrId, "Transferred " + newRemainingNeedToPayAmount.toFixed(2) + " to " + payToUser + ".");
                                                        await dbFunction.dbTransactionLog.insertLog(payToUserId, "Received " + newRemainingNeedToPayAmount.toFixed(2) + " from " + usrName + ".");
                                                        console.log("Transferred " + newRemainingNeedToPayAmount.toFixed(2) + " to " + payToUser + ".");
                                                        await dbFunction.dbUser.setUsrAvailableAmount(usrId, newAmountFrom)
                                                        console.log("Your balance is "+ newAmountFrom + ".");
                                                        process.exit(1);
                                                    }
                                                    // If user cannot pay full amount and need to log debt to that user
                                                    else
                                                    {
                                                        let newDebtAmountToPayUser = (newRemainingNeedToPayAmount - remainingAmountInFloat).toFixed(2);
                                                        // Get pay to user available amount
                                                        let payToUserAvailableValue = await dbFunction.dbUser.getUsrAvailableAmount(payToUserId)
                                                        let remainingPayToAmountInFloat = parseFloat(parseFloat(payToUserAvailableValue).toFixed(2));
                                                        let newAmountPayTo = (remainingPayToAmountInFloat + remainingAmountInFloat).toFixed(2);
                                                        await dbFunction.dbUser.setUsrAvailableAmount(payToUserId, newAmountPayTo)
                                                        await dbFunction.dbTransactionLog.insertLog(usrId, "Transferred " + remainingAmountInFloat.toFixed(2) + " to " + payToUser + ".");
                                                        await dbFunction.dbTransactionLog.insertLog(payToUserId, "Received " + remainingAmountInFloat.toFixed(2) + " from " + usrName + ".");
                                                        console.log("Transferred " + remainingAmountInFloat.toFixed(2) + " to " + payToUser + ".");
                                                        await dbFunction.dbUser.setUsrAvailableAmount(usrId, "0.00")
                                                        console.log("Your balance is 0.00.");
                                                        // To check whether you have debt to pay user before
                                                        let ownTransactionResult = await dbFunction.dbDebtTransaction.getParticularDebtTransaction(usrId, payToUserId)
                                                        let ownDebtId = -1;
                                                        if (ownTransactionResult.result)
                                                        {
                                                            ownDebtId = ownTransactionResult.resultRow.id;
                                                        }
                                                        if (ownDebtId <= -1)
                                                        {
                                                            // Create new debt
                                                            await dbFunction.dbDebtTransaction.createDebtTransaction(usrId, payToUserId, newDebtAmountToPayUser)
                                                            await dbFunction.dbTransactionLog.insertLog(usrId, "Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                            try {
                                                                await dbFunction.dbTransactionLog.insertLog(payToUserId, "Owing " + newDebtAmountToPayUser + " from " + usrName + ".")
                                                                console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                process.exit(1);
                                                            } catch (err) {
                                                                console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                process.exit(1);
                                                            }
                                                        }
                                                        else
                                                        {
                                                            // Update existing record to new value since is 0.00
                                                            await dbFunction.dbDebtTransaction.updateDebtTransaction(ownDebtId, usrId, payToUserId, newDebtAmountToPayUser)
                                                            await dbFunction.dbTransactionLog.insertLog(usrId, "Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                            try {
                                                                await dbFunction.dbTransactionLog.insertLog(payToUserId, "Owing " + newDebtAmountToPayUser + " from " + usrName + ".")
                                                                console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                process.exit(1);
                                                            } catch (err) {
                                                                console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                process.exit(1);
                                                            }
                                                        }
                                                    }
                                                }
                                                // else if already 0, ask user to go topup
                                                else
                                                {
                                                    console.error("Your balance is reached 0.00.");
                                                    console.error("Your remaining pay balance " + newRemainingNeedToPayAmount.toFixed(2) + " cannot be pay now.")
                                                    console.error("Please topup then perform the pay command again.");
                                                    process.exit(1);
                                                }
                                            }
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        process.exit(1);
                                    }
                                } catch (err) {
                                    console.error(err);
                                    console.error("Please first login to that user first to perform auto register.");
                                    process.exit(1);
                                }
                            }
                        }
                        else
                        {
                            console.error("No user login at the moment.");
                            console.error("Please login to perform this command.");
                            process.exit(1);
                        }
                    } catch (err) {
                        console.error(err);
                        process.exit(1);
                    }
                }
            }
        }
        catch(err)
        {
            console.error("Error on processing amount.");
            process.exit(1);
        }
    });


// See last 10 recent record on current login user
// $ bank history [limit]
// limit - limit on how many record to retrieve, optional, default to 10
program
    .command('history [limit]') // sub-command name
    .description('Perform enquiry of current login user for last 10 recent record') // command description
    // function to execute when command is uses
    .action(async function () {
        let defaultLimit = 10;
        if (program.args.length == 2)
        {
            if (program.args[1] <= 0)
            {
                console.error("Limit need to set more than 0.");
                process.exit(1);
            }
            else
            {
                defaultLimit = program.args[1];
            }
        }

        // Check if have existing user login
        try {
            let usrSessionResult = await dbFunction.dbUser.checkUsrSessionLogin()
            if (usrSessionResult.result)
            {
                let usrId = usrSessionResult.userId;
                let usrName = usrSessionResult.userName;
                let recordLogResult = await dbFunction.dbTransactionLog.getLatestHistoryTransactions(usrId, defaultLimit)
                if (recordLogResult.length > 0)
                {
                    let tableLine = "===========================================================";
                    console.log("Hello, " + usrName + "!");
                    console.log("Here's your last " + recordLogResult.length + " transaction(s) performed.");
                    console.log("       Event Log                           Timestamp       ");
                    console.log(tableLine);
                    recordLogResult.forEach((recordLog) => {
                        let defaultSpace = "           ";
                        if ((recordLog.event + defaultSpace + recordLog.transactionTimestamp).length < tableLine.length)
                        {
                            let extraSpaceRequired = tableLine.length - (recordLog.event + defaultSpace + recordLog.transactionTimestamp).length;
                            for(let countIndex = 0; countIndex < extraSpaceRequired; countIndex++)
                            {
                                defaultSpace += " ";
                            }
                        }
                        else if ((recordLog.event + defaultSpace + recordLog.transactionTimestamp).length > tableLine.length)
                        {
                            let strinkSpaceRequired = (recordLog.event + defaultSpace + recordLog.transactionTimestamp).length - tableLine.length;
                            if (strinkSpaceRequired > defaultSpace.length)
                            {
                                strinkSpaceRequired = defaultSpace.length - 1; 
                            }
                            let totalSpaceNeeded = defaultSpace.length - strinkSpaceRequired;
                            defaultSpace = "";
                            for (let countIndex = 0; countIndex < (totalSpaceNeeded); countIndex++)
                            {
                                defaultSpace += " ";
                            }
                        }
                        console.log(recordLog.event + defaultSpace + recordLog.transactionTimestamp);
                    });
                    process.exit(1);
                }
                else
                {
                    console.log("Hello, " + usrName + "!");
                    console.log("There's no record at the moment.");
                    process.exit(1);
                }
            }
            else
            {
                console.error("No user login at the moment.");
                console.error("Please login to perform this command.");
                process.exit(1);
            }
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    });


program.parse(process.argv)