const fs = require('fs');
const path = require('path');
const db = require('./index');

try {
  console.log('[FlowDesk DB] Initializing SQLite database...');
  
  // Read schema definition
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  // Execute the schema statements
  db.exec(schemaSql);
  
  console.log('[FlowDesk DB] Database initialized successfully.');
} catch (error) {
  console.error('[FlowDesk DB] Database initialization failed:', error);
  process.exit(1);
}
