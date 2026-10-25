// config/db.js - MySQL2 connection pool setup with cloud DB support & connectivity check
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbHost = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
const dbPort = Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306;
const dbUser = process.env.DB_USER || process.env.MYSQLUSER || 'parksmart_user';
const dbPassword = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'StrongPass@123';
const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'parksmart';

// Check if connecting to a remote cloud database (needs SSL, unless on Railway internal private network)
const isRemote = dbHost !== 'localhost' && dbHost !== '127.0.0.1';
const isRailwayInternal = dbHost.includes('.railway.internal');
const useSSL = process.env.DB_SSL === 'true' || (isRemote && process.env.DB_SSL !== 'false' && !isRailwayInternal);

const poolConfig = {
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,        // Keep DATE, TIME, and DATETIME as strings without timezone shifting
  decimalNumbers: true,     // Parse DECIMAL columns as JS numbers
  multipleStatements: false // Prevent multiple statement SQL injections
};

if (useSSL) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

// Support full connection string if provided (e.g. DATABASE_URL / MYSQL_URL from Railway / Render)
const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL;
const pool = connectionUri
  ? mysql.createPool({
      uri: connectionUri,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
      decimalNumbers: true,
      multipleStatements: false,
      ssl: useSSL ? { rejectUnauthorized: false } : undefined
    })
  : mysql.createPool(poolConfig);

let dbConnected = false;

// Test connection on application boot
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    dbConnected = true;
    console.log(`[Database] Connected successfully to MySQL database "${dbName}" at ${dbHost}:${dbPort}.`);
    connection.release();
  } catch (error) {
    dbConnected = false;
    console.error(`[Database] Failed to connect to MySQL database at ${dbHost}:${dbPort}:`, error.message);
    console.error('[Database] Tip: Ensure database environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT) are properly configured in Railway or Render.');
  }
}

testConnection();

module.exports = pool;
module.exports.isDbConnected = () => dbConnected;

