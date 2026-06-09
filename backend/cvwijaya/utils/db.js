const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: "localhost",
  user: "kinq6231_cvwijaya_erp",
  password: "kinq6231_cvwijaya_erp",
  database: "kinq6231_cvwijaya_erp",
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

// DEVELOPMENT
// const pool = mysql.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   port: Number(process.env.DB_PORT) || 3306,
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'cvwijaya_erp',
//   waitForConnections: true,
//   connectionLimit: 10,
//   dateStrings: true,
// });

module.exports = pool;
