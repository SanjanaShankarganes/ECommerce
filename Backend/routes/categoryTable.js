const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'categories.db');
const db = new sqlite3.Database(dbPath);
const express = require('express');
const router = express.Router();

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      categoryid INTEGER PRIMARY KEY AUTOINCREMENT,
      categoryname TEXT NOT NULL,
      date TEXT NOT NULL
    )
  `);
});

router.get('/ctable', (req, res) => {        
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const query = `SELECT * FROM categories LIMIT ? OFFSET ?`;

  db.all(query, [limit, offset], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.get('SELECT COUNT(*) AS count FROM categories', (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const totalCategories = countResult.count;
      const totalPages = Math.ceil(totalCategories / limit);

      res.json({
        categories: rows,
        totalCategories,
        totalPages,
        currentPage: parseInt(page),
        perPage: parseInt(limit)
      });
    });
  });
});

router.post('/ctable', (req, res) => {

  const { categories } = req.body;

  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: 'An array of categories is required' });
  }

  const query = `INSERT INTO categories (categoryname, date) VALUES (?, ?)`;

  db.serialize(() => {
    const stmt = db.prepare(query);
    try {
      categories.forEach(({ categoryname, date }) => {
        if (!categoryname || !date) {
          throw new Error('Category name and date are required for all items');
        }
        stmt.run(categoryname, date);
      });
      stmt.finalize();

      res.status(201).json({
        message: 'Categories added successfully',
      });
    } catch (err) {
      stmt.finalize();
      res.status(500).json({ error: err.message });
    }
  });
});

module.exports = router;