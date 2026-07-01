const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'flowdesk.db');
const db = new DatabaseSync(dbPath);

// Enable foreign key constraints for SQLite cascading deletes
db.exec('PRAGMA foreign_keys = ON;');

module.exports = db;
