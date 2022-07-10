let dbQuery = require("./dbQuery");
const bcrypt = require('bcrypt');

const saltRounds = 10;
const createTableString = 'CREATE TABLE IF NOT EXISTS user(id INTEGER PRIMARY KEY, name TEXT NOT NULL, passwordHashed TEXT NOT NULL, status TEXT NOT NULL, totalAmountAvailable TEXT NOT NULL)';

function checkUsrSessionLogin()
{
    return new Promise(async function(resolve, reject){
        let sql = `SELECT id, name
        FROM user
        WHERE status  = 'Online'`;
        try {
            let db = await dbQuery.createOrGetDbConnection()
            db.serialize(() => {
                db.run(createTableString)
                    .get(sql, (err, row) => {
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
                                    userId: row.id,
                                    userName: row.name
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
        } catch (err) {
            reject(err);
        }
    });  
}

function checkUsrExists(name)
{
    return new Promise(async function(resolve, reject){
        let sql = `SELECT id
        FROM user
        WHERE name  = ?`;
        try {
            let db = await dbQuery.createOrGetDbConnection()
            db.serialize(() => {
                db.run(createTableString)
                    .get(sql, [name], (err, row) => {
                        if (err) {
                            db.close();
                            reject(err.message);
                        }
                        else
                        {
                            if (row)
                            {
                                resolve(true);
                            }
                            else
                            {
                                resolve(false);
                            }
                            db.close();
                        }
                    });
              });
        } catch (err) {
            reject(err);
        }
    });
}

function createUsrAndLogin(name, password)
{
    return new Promise(function(resolve, reject){
        let sql = `INSERT INTO user (name, passwordHashed, status, totalAmountAvailable)
        VALUES (?, ?, 'Online', '0.00')`;

        // password will be hashed here by bcrypt
        bcrypt.hash(password, saltRounds, async function(err, hash) {
            if (err)
            {
                reject(err.message);
            }
            else
            {
                try {
                    let db = await dbQuery.createOrGetDbConnection()
                    db.serialize(() => {
                        db.run(createTableString)
                            .run(sql, [name, hash], (err) => {
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
                } catch (err) {
                    reject(err);
                }
            }
        });
    });
}

function forceLogoutAndLogin(name, password)
{
    return new Promise(async function(resolve, reject)
    {
        let updateSql = `UPDATE user SET status = 'Offline'`;
        try {
            let db = await dbQuery.createOrGetDbConnection()
            db.serialize(() => {
                db.run(createTableString)
                    .run(updateSql, async (err) => {
                        if (err) {
                            db.close();
                            reject(err.message);
                        }
                        else
                        {
                            db.close();
                            try {
                                await login(name, password)
                                resolve(true);
                            } catch (err) {
                                reject(err);
                            }
                        }
                    });
              });
        } catch (err) {
            reject(err);
        }
    });
}

function forceLogoutAndCreateUsr(name, password)
{
    return new Promise(async function(resolve, reject)
    {
        let updateSql = `UPDATE user SET status = 'Offline'`;
        try {
            let db = await dbQuery.createOrGetDbConnection()
            db.serialize(() => {
                db.run(createTableString)
                    .run(updateSql, async (err) => {
                        if (err) {
                            db.close();
                            reject(err.message);
                        }
                        else
                        {
                            db.close();
                            try {
                                await createUsrAndLogin(name, password)
                                resolve(true);
                            } catch (err) {
                                reject(err);
                            }
                        }
                    });
              });
        } catch (err) {
            reject(err);
        }
    });
}

function login(name, password)
{
    return new Promise(async function(resolve, reject){
        let getSql = `SELECT passwordHashed FROM user WHERE name  = ?`;
        let updateSql = `UPDATE user SET status = 'Online' where name = ?`;
        try {
            let db = await dbQuery.createOrGetDbConnection()
            db.serialize(() => {
                db.run(createTableString)
                    .get(getSql, [name], (err, row) => {
                        if (err) {
                            db.close();
                            reject(err.message);
                        }
                        else
                        {
                            if (row)
                            {
                                // password hashed will be compare with password typed
                                bcrypt.compare(password, row.passwordHashed, function(err, result) {
                                    if (err)
                                    {
                                        db.close();
                                        reject(err.message);
                                    }
                                    else
                                    {
                                        if (result)
                                        {
                                            db.run(updateSql, [name], (err) => {
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
                                        }
                                        else
                                        {
                                            db.close();
                                            reject("Incorrect Password.");
                                        }
                                    }
                                });
                            }
                            else
                            {
                                db.close();
                                reject("db execute error");
                            }
                        }
                    });
              });
        } catch (err) {
            reject(err);
        }
    });    
}

function logout()
{
    return new Promise(async function(resolve, reject){
        let updateSql = `UPDATE user SET status = 'Offline'`;
        try {
            let db = await dbQuery.createOrGetDbConnection()
            db.serialize(() => {
                db.run(createTableString)
                    .run(updateSql, (err) => {
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
        } catch (err) {
            reject(err);
        }
    });    
}

function getUsrAvailableAmount(id)
{
    return new Promise(async function(resolve, reject){
        let getSql = `SELECT totalAmountAvailable FROM user WHERE id  = ?`;
        try {
            let db = await dbQuery.createOrGetDbConnection()
            db.serialize(() => {
                db.run(createTableString)
                    .get(getSql, [id], (err, row) => {
                        if (err) {
                            db.close();
                            reject(err.message);
                        }
                        else
                        {
                            if (row)
                            {
                                db.close();
                                resolve(row.totalAmountAvailable); 
                            }
                            else
                            {
                                db.close();
                                reject("db execute error");
                            }
                        }
                    });
              });
        } catch (err) {
            reject(err);
        }
    });  
}

function setUsrAvailableAmount(id, amount)
{
    return new Promise(async function(resolve, reject){
        let updateSql = `UPDATE user SET totalAmountAvailable = ? where id = ?`;

        try {
            let db = await dbQuery.createOrGetDbConnection()
            db.serialize(() => {
                db.run(createTableString)
                    .run(updateSql, [amount, id], (err) => {
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
        } catch (err) {
            reject(err);
        }
    });  
}

function getUsrId(name)
{
    return new Promise(async function(resolve, reject){
        let sql = `SELECT id
        FROM user
        WHERE name  = ?`;

        try {
            let db = await dbQuery.createOrGetDbConnection()
            db.serialize(() => {
                db.run(createTableString)
                    .get(sql, [name], (err, row) => {
                        if (err) {
                            db.close();
                            reject(err.message);
                        }
                        else
                        {
                            if (row)
                            {
                                resolve(row.id);
                            }
                            else
                            {
                                reject("User not available.");
                            }
                            db.close();
                        }
                    });
              });
        } catch (err) {
            reject(err);
        }
    });
}

function getUsrName(id)
{
    return new Promise(async function(resolve, reject){
        let sql = `SELECT name
        FROM user
        WHERE id  = ?`;

        try {
            let db = await dbQuery.createOrGetDbConnection()
            db.serialize(() => {
                db.run(createTableString)
                    .get(sql, [id], (err, row) => {
                        if (err) {
                            db.close();
                            reject(err.message);
                        }
                        else
                        {
                            if (row)
                            {
                                resolve(row.name);
                            }
                            else
                            {
                                reject("User not available.");
                            }
                            db.close();
                        }
                    });
              });
        } catch (err) {
            reject(err);
        }
    });
}

module.exports.login = login;
module.exports.logout = logout;
module.exports.checkUsrExists = checkUsrExists;
module.exports.checkUsrSessionLogin = checkUsrSessionLogin;
module.exports.createUsrAndLogin = createUsrAndLogin;
module.exports.forceLogoutAndLogin = forceLogoutAndLogin;
module.exports.forceLogoutAndCreateUsr = forceLogoutAndCreateUsr;
module.exports.getUsrAvailableAmount = getUsrAvailableAmount;
module.exports.setUsrAvailableAmount = setUsrAvailableAmount;
module.exports.getUsrId = getUsrId;
module.exports.getUsrName = getUsrName;