const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');



const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json()); 

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public/profile.html')));
app.get('/comments', (req, res) => res.sendFile(path.join(__dirname, 'public/blog.html')));

// Создаем или подключаемся к БД
const db = new sqlite3.Database('ratings.db', (err) => {
 if (err) {
 console.error('Ошибка при подключении к БД:', err);
 }
 console.log('Подключено к БД');
});

// Создаем таблицу при запуске сервера
db.serialize(() => {
    //База данных рейтинга 
 db.run(`
 CREATE TABLE IF NOT EXISTS ratings (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 rating INTEGER
 )
 `);
    //База данных пользователей
 db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    password TEXT
)`);
    //База данных коментариев
db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    comment TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
)`);
});

// Регистрация
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
        if (err) return res.json({ success: false, message: 'Ошибка регистрации' });
        res.json({ success: true, message: 'Регистрация успешна' });
    });
});

// Вход
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT id, username FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err || !user) return res.json({ success: false, message: 'Неверные учетные данные' });

        req.session.user = user;
        res.json({ success: true, message: 'Вход выполнен' });
    });
});

// Проверка сессии
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// Выход
app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true, message: 'Выход выполнен' });
    });
});

// Добавление комментария
app.post('/api/comments', (req, res) => {
    if (!req.session.user) return res.json({ success: false, message: 'Необходимо войти в аккаунт' });

    const { comment } = req.body;
    db.run('INSERT INTO comments (user_id, comment) VALUES (?, ?)', [req.session.user.id, comment], function(err) {
        if (err) return res.json({ success: false, message: 'Ошибка при добавлении комментария' });
        res.json({ success: true, message: 'Комментарий добавлен' });
    });
});

// Получение всех комментариев
app.get('/api/comments', (req, res) => {
    db.all('SELECT comments.comment, users.username FROM comments JOIN users ON comments.user_id = users.id', [], (err, rows) => {
        if (err) return res.json({ success: false, message: 'Ошибка загрузки комментариев' });
        res.json(rows);
    });
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