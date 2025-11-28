const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv').config();

const router = express.Router();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'data', 'users.db');
const db = new sqlite3.Database(dbPath);

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )
`);

const JWT_SECRET = process.env.JWT_SECRET;

router.post('/signup', (req, res) => {
    const { name, username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    bcrypt.hash(password, 12, (err, hash) => {
        if (err) return res.status(500).json({ message: 'Server error' });

        db.run(
            `INSERT INTO users (name, username, password) VALUES (?, ?, ?)`,
            [name, username, hash],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint')) {
                        return res.status(400).json({ message: 'Username already exists' });
                    }
                    return res.status(500).json({ message: 'Server error' });
                }
                res.status(201).json({ message: 'User registered successfully' });
            }
        );
    });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) return res.status(500).json({ message: 'Server error' });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).json({ message: 'Server error' });

            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.json({
                message: 'Login successful',
                token: token
            });
        });
    });
});

router.get('/users', (req, res) => {
    const query = `SELECT id, name, username,password FROM users`;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }

        res.json({ users: rows });
    });
});

// router.get('/protected', verifyToken, (req, res) => {
//     res.json({ message: 'This is a protected route', user: req.user });
// });

module.exports = router;
