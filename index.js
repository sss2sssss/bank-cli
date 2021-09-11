#!/usr/bin/env node

const program = require('commander');
let dbFunction = require('./db-query/dbFunction');
let dbFunctionBatch = require('./db-query/dbFunctionBatch');
var passwordRegex = new RegExp("^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{8,}$");
var amountRegex = new RegExp("^[0-9]+(\.[0-9]{1,2})?$");


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
    .action(function () {
        var forceLogout = false;
        var name = "";
        var password = "";

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
            dbFunction.dbUser.checkUsrExists(name)
            .then((flag) => {
                if (flag)
                {
                    // force login
                    dbFunction.dbUser.forceLogoutAndLogin(name, password)
                    .then(() =>{
                        dbFunction.dbUser.getUsrId(name)
                        .then((index) => {
                            console.log("Hello, " + name + "!");
                            // Batch generating login amount report
                            dbFunctionBatch.processLoginLogReportBatch(index);
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
                    // force create user and login
                    dbFunction.dbUser.forceLogoutAndCreateUsr(name, password)
                    .then(() => {
                        console.log("Hello, " + name + "!");
                        console.log("Your balance is 0.00.");
                        process.exit(1);
                    })
                    .catch((err) => {
                        console.error(err);
                        process.exit(1);
                    });
                }
            })
            .catch((err) => {
                console.error(err);
                process.exit(1);
            });
        }
    });


// Topup current user amount
// $ bank topup <amount>
// amount - amount to topup, required
program
    .command('topup <amount>') // sub-command name
    .description('Perform topup with current user login') // command description
    // function to execute when command is uses
    .action(function () {
        var amount = 0;
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
                var amountInFloat = parseFloat(parseFloat(amount).toFixed(2));
                if (amountInFloat <= 0.00)
                {
                    console.error("Amount enter need to be greater than 0.00.");
                    process.exit(1);
                }
                else
                {
                    // Check if have existing user login
                    dbFunction.dbUser.checkUsrSessionLogin()
                    .then((usrSessionResult) => {
                        if (usrSessionResult.result)
                        {
                            let usrId = usrSessionResult.userId;
                            let usrName = usrSessionResult.userName;
                            dbFunction.dbDebtTransaction.getOwnToTransaction(usrId)
                            .then((ownToResult) => {
                                if (ownToResult.length > 0)
                                {
                                    // process batch
                                    dbFunctionBatch.processOwnToTransactionBatch(ownToResult, amountInFloat, 0, usrId, usrName);
                                }
                                else
                                {
                                    // direct top up amount
                                    dbFunction.dbUser.getUsrAvailableAmount(usrId)
                                    .then((value) => {
                                        var remainingAmountInFloat = parseFloat(parseFloat(value).toFixed(2));
                                        var newAmount = (remainingAmountInFloat + amountInFloat).toFixed(2);
                                        dbFunction.dbUser.setUsrAvailableAmount(usrId, newAmount)
                                        .then(() => {
                                            dbFunction.dbTransactionLog.insertLog(usrId, "Top up " + amountInFloat.toFixed(2) + ".")
                                            .then(() => {
                                                console.log("Your balance is "+ newAmount + ".");
                                                process.exit(1);
                                            })
                                            .catch((err) => {
                                                console.log("Your balance is "+ newAmount + ".");
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
                            .catch((err) => {
                                console.error(err);
                                process.exit(1);
                            });
                        }
                        else
                        {
                            console.error("No user login at the moment.");
                            console.error("Please login to perform this command.");
                            process.exit(1);
                        }
                    })
                    .catch((err) => {
                        console.error(err);
                        process.exit(1);
                    });
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
    .action(function () {
        var payToUser = "";
        var amount = 0;
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
                var amountInFloat = parseFloat(parseFloat(amount).toFixed(2));
                if (amountInFloat <= 0.00)
                {
                    console.error("Amount enter need to be greater than 0.00.");
                    process.exit(1);
                }
                else
                {
                    // Check if have existing user login
                    dbFunction.dbUser.checkUsrSessionLogin()
                    .then((usrSessionResult) => {
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
                                dbFunction.dbUser.getUsrId(payToUser)
                                .then((payToUserId) => {
                                    dbFunction.dbDebtTransaction.getParticularDebtTransaction(payToUserId, usrId)
                                    .then((transactionResult) => {
                                        let debtId = -1;
                                        let debtAmountInFloat = 0.00;
                                        if (transactionResult.result)
                                        {
                                            debtId = transactionResult.resultRow.id;
                                            debtAmountInFloat = parseFloat(parseFloat(transactionResult.resultRow.debtAmount).toFixed(2));
                                        }

                                        // get user available amount
                                        dbFunction.dbUser.getUsrAvailableAmount(usrId)
                                        .then((value) => {
                                            var remainingAmountInFloat = parseFloat(parseFloat(value).toFixed(2));
                                            // If there's not debt transaction or there is and debt amount is 0
                                            if (debtId <= -1 || (debtId > -1 && debtAmountInFloat == 0.00))
                                            {
                                                // If have remaining amount, allow to pay
                                                if (remainingAmountInFloat > 0.00)
                                                {
                                                    // If user still can pay full amount
                                                    if (remainingAmountInFloat > amountInFloat)
                                                    {
                                                        var newAmountFrom = (remainingAmountInFloat - amountInFloat).toFixed(2);
                                                        // Get pay to user available amount
                                                        dbFunction.dbUser.getUsrAvailableAmount(payToUserId)
                                                        .then((payToUserAvailableValue) => {
                                                            var remainingPayToAmountInFloat = parseFloat(parseFloat(payToUserAvailableValue).toFixed(2));
                                                            var newAmountPayTo = (remainingPayToAmountInFloat + amountInFloat).toFixed(2);
                                                            dbFunction.dbUser.setUsrAvailableAmount(payToUserId, newAmountPayTo)
                                                            .then(() => {
                                                                dbFunction.dbTransactionLog.insertLog(usrId, "Transferred " + amountInFloat.toFixed(2) + " to " + payToUser + ".");
                                                                dbFunction.dbTransactionLog.insertLog(payToUserId, "Received " + amountInFloat.toFixed(2) + " from " + usrName + ".");
                                                                console.log("Transferred " + amountInFloat.toFixed(2) + " to " + payToUser + ".");
                                                                dbFunction.dbUser.setUsrAvailableAmount(usrId, newAmountFrom)
                                                                .then(() => {
                                                                    console.log("Your balance is "+ newAmountFrom + ".");
                                                                    process.exit(1);
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
                                                    // If user cannot pay full amount and need to log debt to that user
                                                    else
                                                    {
                                                        var newDebtAmountToPayUser = (amountInFloat - remainingAmountInFloat).toFixed(2);
                                                        // Get pay to user available amount
                                                        dbFunction.dbUser.getUsrAvailableAmount(payToUserId)
                                                        .then((payToUserAvailableValue) => {
                                                            var remainingPayToAmountInFloat = parseFloat(parseFloat(payToUserAvailableValue).toFixed(2));
                                                            var newAmountPayTo = (remainingPayToAmountInFloat + remainingAmountInFloat).toFixed(2);
                                                            dbFunction.dbUser.setUsrAvailableAmount(payToUserId, newAmountPayTo)
                                                            .then(() => {
                                                                dbFunction.dbTransactionLog.insertLog(usrId, "Transferred " + remainingAmountInFloat.toFixed(2) + " to " + payToUser + ".");
                                                                dbFunction.dbTransactionLog.insertLog(payToUserId, "Received " + remainingAmountInFloat.toFixed(2) + " from " + usrName + ".");
                                                                console.log("Transferred " + remainingAmountInFloat.toFixed(2) + " to " + payToUser + ".");
                                                                dbFunction.dbUser.setUsrAvailableAmount(usrId, "0.00")
                                                                .then(() => {
                                                                    console.log("Your balance is 0.00.");
                                                                    // To check whether you have debt to pay user before
                                                                    dbFunction.dbDebtTransaction.getParticularDebtTransaction(usrId, payToUserId)
                                                                    .then((ownTransactionResult) => {
                                                                        let ownDebtId = -1;
                                                                        if (ownTransactionResult.result)
                                                                        {
                                                                            ownDebtId = ownTransactionResult.resultRow.id;
                                                                        }
                                                                        if (ownDebtId <= -1)
                                                                        {
                                                                            // Create new debt
                                                                            dbFunction.dbDebtTransaction.createDebtTransaction(usrId, payToUserId, newDebtAmountToPayUser)
                                                                            .then(() => {
                                                                                dbFunction.dbTransactionLog.insertLog(usrId, "Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                                dbFunction.dbTransactionLog.insertLog(payToUserId, "Owing " + newDebtAmountToPayUser + " from " + usrName + ".")
                                                                                .then(() => {
                                                                                    console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                                    process.exit(1);
                                                                                })
                                                                                .catch((err) => {
                                                                                    console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
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
                                                                            // Update existing record to new value since is 0.00
                                                                            dbFunction.dbDebtTransaction.updateDebtTransaction(ownDebtId, usrId, payToUserId, newDebtAmountToPayUser)
                                                                            .then(() => {
                                                                                dbFunction.dbTransactionLog.insertLog(usrId, "Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                                dbFunction.dbTransactionLog.insertLog(payToUserId, "Owing " + newDebtAmountToPayUser + " from " + usrName + ".")
                                                                                .then(() => {
                                                                                    console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                                    process.exit(1);
                                                                                })
                                                                                .catch((err) => {
                                                                                    console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                                    process.exit(1);
                                                                                });
                                                                            })
                                                                            .catch((err) => {
                                                                                console.error(err);
                                                                                process.exit(1);
                                                                            });
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
                                                        })
                                                        .catch((err) => {
                                                            console.error(err);
                                                            process.exit(1);
                                                        }); 
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
                                                    dbFunction.dbDebtTransaction.updateDebtTransaction(debtId, payToUserId, usrId, newDebtAmount)
                                                    .then(() => {
                                                        dbFunction.dbTransactionLog.insertLog(usrId, "Owing " + newDebtAmount + " from " + payToUser + ".");
                                                        dbFunction.dbTransactionLog.insertLog(payToUserId, "Owing " + newDebtAmount + " to " + usrName + ".")
                                                        .then(() => {
                                                            console.log("Owing " + newDebtAmount + " from " + payToUser + ".");
                                                            console.log("Your balance is " + remainingAmountInFloat.toFixed(2) + ".");
                                                            process.exit(1);
                                                        })
                                                        .catch((err) => {
                                                            console.log("Owing " + newDebtAmount + " from " + payToUser + ".");
                                                            console.log("Your balance is " + remainingAmountInFloat.toFixed(2) + ".");
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
                                                    let newRemainingNeedToPayAmount = amountInFloat - debtAmountInFloat;
                                                    // Update existing record to 0.00
                                                    dbFunction.dbDebtTransaction.updateDebtTransaction(debtId, payToUserId, usrId, "0.00")
                                                    .then(() => {
                                                        dbFunction.dbTransactionLog.insertLog(usrId, "Owing 0.00 from " + payToUser + ".");
                                                        dbFunction.dbTransactionLog.insertLog(payToUserId, "Owing 0.00 to " + usrName + ".");
                                                        console.log("Owing 0.00 from " + payToUser + ".");
                                                        dbFunction.dbUser.getUsrAvailableAmount(usrId)
                                                        .then((value) => {
                                                            var remainingAmountInFloat = parseFloat(parseFloat(value).toFixed(2));
                                                            if (remainingAmountInFloat > 0.00)
                                                            {
                                                                // If user still can pay full amount
                                                                if (remainingAmountInFloat > newRemainingNeedToPayAmount)
                                                                {
                                                                    var newAmountFrom = (remainingAmountInFloat - newRemainingNeedToPayAmount).toFixed(2);
                                                                    // Get pay to user available amount
                                                                    dbFunction.dbUser.getUsrAvailableAmount(payToUserId)
                                                                    .then((payToUserAvailableValue) => {
                                                                        var remainingPayToAmountInFloat = parseFloat(parseFloat(payToUserAvailableValue).toFixed(2));
                                                                        var newAmountPayTo = (remainingPayToAmountInFloat + newRemainingNeedToPayAmount).toFixed(2);
                                                                        dbFunction.dbUser.setUsrAvailableAmount(payToUserId, newAmountPayTo)
                                                                        .then(() => {
                                                                            dbFunction.dbTransactionLog.insertLog(usrId, "Transferred " + newRemainingNeedToPayAmount.toFixed(2) + " to " + payToUser + ".");
                                                                            dbFunction.dbTransactionLog.insertLog(payToUserId, "Received " + newRemainingNeedToPayAmount.toFixed(2) + " from " + usrName + ".");
                                                                            console.log("Transferred " + newRemainingNeedToPayAmount.toFixed(2) + " to " + payToUser + ".");
                                                                            dbFunction.dbUser.setUsrAvailableAmount(usrId, newAmountFrom)
                                                                            .then(() => {
                                                                                console.log("Your balance is "+ newAmountFrom + ".");
                                                                                process.exit(1);
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
                                                                // If user cannot pay full amount and need to log debt to that user
                                                                else
                                                                {
                                                                    var newDebtAmountToPayUser = (newRemainingNeedToPayAmount - remainingAmountInFloat).toFixed(2);
                                                                    // Get pay to user available amount
                                                                    dbFunction.dbUser.getUsrAvailableAmount(payToUserId)
                                                                    .then((payToUserAvailableValue) => {
                                                                        var remainingPayToAmountInFloat = parseFloat(parseFloat(payToUserAvailableValue).toFixed(2));
                                                                        var newAmountPayTo = (remainingPayToAmountInFloat + remainingAmountInFloat).toFixed(2);
                                                                        dbFunction.dbUser.setUsrAvailableAmount(payToUserId, newAmountPayTo)
                                                                        .then(() => {
                                                                            dbFunction.dbTransactionLog.insertLog(usrId, "Transferred " + remainingAmountInFloat.toFixed(2) + " to " + payToUser + ".");
                                                                            dbFunction.dbTransactionLog.insertLog(payToUserId, "Received " + remainingAmountInFloat.toFixed(2) + " from " + usrName + ".");
                                                                            console.log("Transferred " + remainingAmountInFloat.toFixed(2) + " to " + payToUser + ".");
                                                                            dbFunction.dbUser.setUsrAvailableAmount(usrId, "0.00")
                                                                            .then(() => {
                                                                                console.log("Your balance is 0.00.");
                                                                                // To check whether you have debt to pay user before
                                                                                dbFunction.dbDebtTransaction.getParticularDebtTransaction(usrId, payToUserId)
                                                                                .then((ownTransactionResult) => {
                                                                                    let ownDebtId = -1;
                                                                                    if (ownTransactionResult.result)
                                                                                    {
                                                                                        ownDebtId = ownTransactionResult.resultRow.id;
                                                                                    }
                                                                                    if (ownDebtId <= -1)
                                                                                    {
                                                                                        // Create new debt
                                                                                        dbFunction.dbDebtTransaction.createDebtTransaction(usrId, payToUserId, newDebtAmountToPayUser)
                                                                                        .then(() => {
                                                                                            dbFunction.dbTransactionLog.insertLog(usrId, "Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                                            dbFunction.dbTransactionLog.insertLog(payToUserId, "Owing " + newDebtAmountToPayUser + " from " + usrName + ".")
                                                                                            .then(() => {
                                                                                                console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                                                process.exit(1);
                                                                                            })
                                                                                            .catch((err) => {
                                                                                                console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
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
                                                                                        // Update existing record to new value since is 0.00
                                                                                        dbFunction.dbDebtTransaction.updateDebtTransaction(ownDebtId, usrId, payToUserId, newDebtAmountToPayUser)
                                                                                        .then(() => {
                                                                                            dbFunction.dbTransactionLog.insertLog(usrId, "Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                                            dbFunction.dbTransactionLog.insertLog(payToUserId, "Owing " + newDebtAmountToPayUser + " from " + usrName + ".")
                                                                                            .then(() => {
                                                                                                console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                                                process.exit(1);
                                                                                            })
                                                                                            .catch((err) => {
                                                                                                console.log("Owing " + newDebtAmountToPayUser + " to " + payToUser + ".");
                                                                                                process.exit(1);
                                                                                            });
                                                                                        })
                                                                                        .catch((err) => {
                                                                                            console.error(err);
                                                                                            process.exit(1);
                                                                                        });
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
                                                                    })
                                                                    .catch((err) => {
                                                                        console.error(err);
                                                                        process.exit(1);
                                                                    }); 
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
                                    console.error("Please first login to that user first to perform auto register.");
                                    process.exit(1);
                                });
                            }
                        }
                        else
                        {
                            console.error("No user login at the moment.");
                            console.error("Please login to perform this command.");
                            process.exit(1);
                        }
                    })
                    .catch((err) => {
                        console.error(err);
                        process.exit(1);
                    });
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
    .action(function () {
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
        dbFunction.dbUser.checkUsrSessionLogin()
        .then((usrSessionResult) => {
            if (usrSessionResult.result)
            {
                let usrId = usrSessionResult.userId;
                let usrName = usrSessionResult.userName;
                dbFunction.dbTransactionLog.getLatestHistoryTransactions(usrId, defaultLimit)
                .then((recordLogResult) => {
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
                })
                .catch((err) => {
                    console.error(err);
                    process.exit(1); 
                })
            }
            else
            {
                console.error("No user login at the moment.");
                console.error("Please login to perform this command.");
                process.exit(1);
            }
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
    });


program.parse(process.argv)