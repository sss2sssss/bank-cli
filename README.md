Simple Bank CLI developed by using commander, sqlite, and bcrypt (for password authentication) with Node.js.

It allow user to type bank command on command prompt without have any active windows need to run with.



## Before Start
You will need to download and install Node.js first before running the code.
The link to download is on below:
https://nodejs.org/en/download/

After download the installer, double click and follow the instruction to complete.

Then download the project zip file, extract it and went to the root of project folder (where you can see index.js at there), open terminal/ command prompt and type following script command to initiate project:
npm run first-initiate



## Available Scripts

In the project directory, you can run:


### `npm run first-initiate`

This script command helps you to install all the node modules that's required to run.<br/>
And make the cli available to global environment.



## Database

In this project, SQLite is used for any transaction and user logging.<br/>
The database named bank.db will auto created if any command is fired up and there's no database exists.<br/>



### Table(s)

Here are the list of table been used and column defined


#### user

1) id (INTEGER, PRIMARY KEY, AUTO INCREMENTAL, index id)<br/>
2) name (TEXT, NOT NULL, user name)<br/>
3) passwordHashed (TEXT NOT NULL, password hashed by bcrypt)<br/>
4) status (TEXT NOT NULL, user status ['Online', 'Offline'])<br/>
5) totalAmountAvailable (TEXT NOT NULL, current available amount)<br/>


#### debtTransaction

1) id (INTEGER, PRIMARY KEY, AUTO INCREMENTAL, index id)<br/>
2) performUserId (INTEGER, NOT NULL, own from person id)<br/>
3) toUserId (INTEGER NOT NULL, own to person id)<br/>
4) debtAmount (TEXT NOT NULL, debt amount)<br/>
5) lastUpdateTimestamp (TEXT NOT NULL, last update timestamp by ISO string with GMT timezone)<br/>


#### transactionLog

1) id (INTEGER, PRIMARY KEY, AUTO INCREMENTAL, index id)<br/>
2) performUserId (INTEGER, NOT NULL, person id to view the log)<br/>
3) event (TEXT NOT NULL, event detail)<br/>
4) transactionTimestamp (TEXT NOT NULL, transaction timestamp by ISO string with GMT timezone)<br/>



## Available Commands

All the commands need to be start with 'bank', example:<br/>
bank login Alice 1234567b<br/>
bank pay Bob 20<br/>


### `bank -h, --help `

To call up the help content for all the commands availble inside this cli


### `bank -V, --version`

To give the current cli version


### `bank login <name> <password>`

name - required, password - required<br/>
To login to certain user if password is matched with password hash by bcrypt<br/>
If there's no user matched with the name provided, it will auto register a new profile<br/>
The password need to have at least 8 characters, one number and one character<br/>

#### `Possible Output(s)`

1) When the password provided is less than 8 character: <br/>
"Password length should need to have at least 8 character."<br/>
"Which consists at least one character and one number."<br/>

2) When the password provided doesn't contain at least one character and one number: <br/>
"Password doesn't contain at least one character and one number."<br/>

3) When password provided doesn't matched with existed user profile password hash: <br/>
"Incorrect Password.<br/>

4) If login perform successfully: <br/>
"Hello, <'name'>!"<br/>
(If have someone own you money) "Owing <'debt amount'> from <'own person'>."<br/>
"Your balance is <'available value'>."<br/>
(If have you own someone money) "Owing <'debt amount'> to <'debt person'>."<br/>


### `bank topup <amount>`

amount - required<br/>
To topup amount provided to active user login<br/>
A active user session must exists, if doesn't have you will have need to login with any user to perform<br/>
The topup will only applied to most recent user session<br/>
The amount provided must need to be greater than 0, can accept numeric and / or decimal with two decimal places<br/>
If the active user session have own any other user money, it will priority to transfer the money to that user first<br/>

#### `Possible Output(s)`

1) When amount provided is not numeric / there's other than decimal separator appear / more than two decimal typed: <br/>
"Amount enter allowed only numeric and / or decimal with two decimal places."<br/>

2) When the amount provided is less or equal to 0.00 <br/>
"Amount enter need to be greater than 0.00."<br/>

3) When there's no any active user login: <br/>
"No user login at the moment."<br/>
"Please login to perform this command."<br/>

4) If have active user login: <br/>
(If you need to pay debt to own person) "Transferred <'amount need to pay'> to <'own person'>."<br/>
"Your balance is <'final available value (previous available value + (topup amount - total amount need to pay))'>."<br/>


### `bank pay <user> <amount>`

user - required, amount - required<br/>
To transfer your available amount to certain user<br/>
A active user session must exists, if doesn't have you will have need to login with any user to perform<br/>
The targeted user must not be same user as requested user<br/>
The targeted user must be valid user, if the targeted user is not exists it will not allowed to transfer<br/>
If targeted user own this user money, it will priority reduce the own amount first<br/>
If there's no any available amount to transfer (0.00), it will stop the operation and request user to topup first<br/>
If the amount is not enough to make the full amount to transfer, it will first transfer all the available amount then create debt tranaction to own the targeted user remaining money<br/>

#### `Possible Output(s)`

1) When amount provided is not numeric / there's other than decimal separator appear / more than two decimal typed: <br/>
"Amount enter allowed only numeric and / or decimal with two decimal places."<br/>

2) When the amount provided is less or equal to 0.00 <br/>
"Amount enter need to be greater than 0.00."<br/>

3) When there's no any active user login: <br/>
"No user login at the moment."<br/>
"Please login to perform this command."<br/>

4) When same user is typed on pay command: <br/>
"Pay function cannot be use on same user."<br/>
"Please type another username to perform this command."<br/>

5) When targeted user is not exists: <br/>
"Please first login to that user first to perform auto register."<br/>

6) When your remaining amount reach 0 and you don't have any debt from targeted user: <br/>
"Your balance is reached 0.00."<br/>
"And your had no remaining debt from <'targeted user'>."<br/>
"Please topup before perform this command.";<br/>

7) When your remaining amount reach 0 and the debt amount is already been paid off: <br/>
"Your balance is reached 0.00."<br/>
"Your remaining pay balance  <'pay balance'>  cannot be pay now."<br/>
"Please topup then perform the pay command again.";<br/>

8) If pay amount can proceed: <br/>
(If there is debt from targeted person need to deduct) "Owning <'new debt amount'> from <'targeted user'>."<br/>
(If there is have amount remaining need to transfer) "Transferred <'amount need transfer'> to <'targeted user'>."<br/>
"Your balance is <'final available value (previous available vlue - (amount need transfer))'>."<br/>
(If there is still have amount remaining cannot pay and need to perform debt) "Owing <'amount to own'> to <'targeted user'>."<br/>


### `bank history [limit]`

limit - optional; if not specific default to 10<br/>
To view recent transaction history for active user login<br/>
A active user session must exists, if doesn't have you will have need to login with any user to perform<br/>
Limit is to specific maximun transaction shown, need to more than 0 if specific<br/>
If there's no transaction history to show, it will show no history appear<br/>
Else it will show table list wiith event detail and transaction time<br/>

#### `Possible Output(s)`

1) If limit supplied less than 0: <br/>
"Limit need to set more than 0."

2) When there's no any active user login: <br/>
"No user login at the moment."<br/>
"Please login to perform this command."<br/>

3) When there is no record: <br/>
"Hello, <'name'>!"<br/>
"There's no record at the moment."<br/>

4) If there is have any transaction record: <br/>
Example: <br/>
Hello, Bob!
Here's your last 7 transaction(s) performed.
       Event Log                           Timestamp
===========================================================
Top up 90.00.                      2020-04-08T12:00:37.644Z
Transferred 10.00 to Alice.        2020-04-08T12:00:37.612Z
Owing 10.00 to Alice.              2020-04-08T12:00:14.787Z
Transferred 30.00 to Alice.        2020-04-08T11:59:49.831Z
Owing 70.00 to Alice.              2020-04-08T11:59:36.038Z
Transferred 30.00 to Alice.        2020-04-08T11:59:35.980Z
Top up 80.00.                      2020-04-08T11:59:25.385Z