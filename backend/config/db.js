// config/db.js - MySQL2 connection pool setup and connectivity health check
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'parksmart_user',
  password: process.env.DB_PASSWORD || 'StrongPass@123',
  database: process.env.DB_NAME || 'parksmart',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  dateStrings: true,        // Keep DATE, TIME, and DATETIME as strings without timezone shifting
  decimalNumbers: true,     // Parse DECIMAL columns as JS numbers
  multipleStatements: false // Prevent multiple statement SQL injections
});

// Test connection on application boot
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL database "${process.env.DB_NAME || 'parksmart'}" on port ${process.env.DB_PORT || 3306}.`);
    connection.release();
  } catch (error) {
    console.error('[Database] Failed to connect to MySQL database:', error.message);
    process.exit(1);
  }
}

testConnection();

module.exports = pool;
