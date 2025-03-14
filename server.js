const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(express.static('public'));

// Создаем или подключаемся к БД
const db = new sqlite3.Database('ratings.db', (err) => {
 if (err) {
 console.error('Ошибка при подключении к БД:', err);
 }
 console.log('Подключено к БД');
});

// Создаем таблицу при запуске сервера
db.serialize(() => {
 db.run(`
 CREATE TABLE IF NOT EXISTS ratings (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 rating INTEGER
 )
 `);
});

app.use(bodyParser.json());

app.post('/api/ratings', async (req, res) => {
 try {
 const rating = req.body.rating;
 
 const stmt = db.prepare('INSERT INTO ratings (rating) VALUES (?)');
 const result = await new Promise((resolve, reject) => {
 stmt.run(rating, (err) => {
 if (err) reject(err);
 resolve(stmt.lastID);
 });
 });
 
 res.json({ success: true, ratingId: result });
 } catch (error) {
 res.status(500).json({ success: false, error: error.message });
 }
});

app.listen(port, () => {
 console.log(`Сервер запущен на http://localhost:${port}`);
});

app.get('/api/average_rating', (req, res) => {
    db.get('SELECT AVG(rating) AS average_rating FROM ratings', (err, row) => {
        if (err) {
            console.error('Ошибка при получении среднего рейтинга:', err);
            return res.status(500).json({ success: false, error: err.message });
        }
        // Если рейтинг null (когда нет данных), устанавливаем 0.0
        const averageRating = row && row.average_rating ? parseFloat(row.average_rating).toFixed(1) : "0.0";
        res.json({ average_rating: parseFloat(averageRating) });
    });
});