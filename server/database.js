const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ensure the data directory exists (especially important for Docker volumes)
const fs = require('fs');
const dbPath = path.resolve(__dirname, 'data', 'homepage.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created directory: ${dbDir}`);
}


const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log(`Connected to the SQLite database at ${dbPath}`);
        initializeDb();
    }
});

function initializeDb() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                position INTEGER NOT NULL
            )
        `, (err) => {
            if (err) console.error("Error creating categories table:", err.message);
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                new_tab BOOLEAN NOT NULL DEFAULT 0,
                category_id INTEGER NOT NULL,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error("Error creating links table:", err.message);
        });

        // Add unique index for category position to help manage order
        db.run(`CREATE INDEX IF NOT EXISTS idx_category_position ON categories(position)`, (err) => {
             if (err) console.error("Error creating position index:", err.message);
        });
    });
}

// Helper function to run queries with Promises
const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) { // Use function() to access `this`
        if (err) {
            console.error('Error running sql:', sql, params);
            console.error(err.message);
            reject(err);
        } else {
            resolve({ id: this.lastID, changes: this.changes });
        }
    });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
        if (err) {
            console.error('Error running sql:', sql, params);
            console.error(err.message);
            reject(err);
        } else {
            resolve(result);
        }
    });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error running sql:', sql, params);
            console.error(err.message);
            reject(err);
        } else {
            resolve(rows);
        }
    });
});

module.exports = { db, run, get, all };