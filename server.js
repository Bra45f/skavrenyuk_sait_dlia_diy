const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 3000;


app.set('view engine', 'ejs');
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json()); 

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Указываем Express, где искать статические файлы
app.use(express.static(path.join(__dirname, 'views')));

app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public/profile.html')));
app.get('/comments', (req, res) => res.sendFile(path.join(__dirname, 'public/bloglist.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

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
db.run(`CREATE TABLE IF NOT EXISTS blogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL
)`);
});

  

// Регистрация
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], function(err) {
        if (err) return res.json({ success: false, message: 'Ошибка регистрации' });
        res.json({ success: true, message: 'Новый пользователь зарегистрирован' });
    });
});

// Вход
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT id, username FROM users WHERE username = ? AND password = ?', [username, password], (err, user) => {
        if (err || !user) return res.json({ success: false, message: 'Неверные учетные данные' });
        req.session.user = user;
        res.json({ success: true, message: 'Добро пожаловать!' });
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
        res.json({ success: true });
    });
});

// Добавление комментария
app.post('/api/comments', (req, res) => {
    if (!req.session.user) return res.json({ success: false, message: 'Необходимо войти в аккаунт' });

    const { comment } = req.body;
    db.run('INSERT INTO comments (user_id, comment) VALUES (?, ?)', [req.session.user.id, comment], function(err) {
        if (err) return res.json({ success: false, message: 'Ошибка при добавлении комментария' });
        res.json({ success: true, message: 'Спасибо за ваш отзыв!' });
    });
});

// Получение всех комментариев
app.get('/api/comments', (req, res) => {
    db.all('SELECT comments.comment, users.username FROM comments JOIN users ON comments.user_id = users.id', [], (err, rows) => {
        if (err) return res.json({ success: false, message: 'Ошибка загрузки комментариев' });
        res.json(rows);
    });
});

app.get('/api/blogs', (req, res) => {
  db.all('SELECT * FROM blogs', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/blogs', (req, res) => {
  const { title, description, content } = req.body;

  db.run('INSERT INTO blogs (title, description, content) VALUES (?, ?, ?)', [title, description, content], function(err) {
    if (err) return res.status(500).json({ error: err.message });

    const blogId = this.lastID;
    const dbDir = path.join(__dirname, 'db');

    // Создаем папку, если ее нет
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir);
    }

    const blogDbPath = path.join(dbDir, `blog_${blogId}.db`);
    const blogDb = new sqlite3.Database(blogDbPath, (err) => {
      if (err) {
        console.error('Ошибка при создании блога:', err);
        return res.status(500).json({ error: 'Не удалось создать базу для блога' });
      }

      blogDb.serialize(() => {
        blogDb.run('CREATE TABLE IF NOT EXISTS ratings (id INTEGER PRIMARY KEY AUTOINCREMENT, value INTEGER)');
        blogDb.run('CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, text TEXT)');
      });

      res.json({ success: true, id: blogId });
    });
  });
});



app.post('/api/blogs/:id/ratings', (req, res) => {
  const blogId = req.params.id;
  const rating = req.body.rating;
  const blogDb = new sqlite3.Database(`db/blog_${blogId}.db`);
  blogDb.run('INSERT INTO ratings (value) VALUES (?)', [rating], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/blogs/:id/average_rating', (req, res) => {
  const blogId = req.params.id;
  const blogDb = new sqlite3.Database(`db/blog_${blogId}.db`);
  blogDb.get('SELECT AVG(value) as average_rating FROM ratings', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/blogs/:id/comments', (req, res) => {
  const blogId = req.params.id;
  const { text } = req.body;
  const blogDb = new sqlite3.Database(`db/blog_${blogId}.db`);
  blogDb.run('INSERT INTO comments (text) VALUES (?)', [text], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.get('/api/blogs/:id/comments', (req, res) => {
  const blogId = req.params.id;
  const blogDb = new sqlite3.Database(`db/blog_${blogId}.db`);
  blogDb.all('SELECT * FROM comments', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


app.put('/api/blogs/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, content} = req.body;

  if (title !== undefined)
    db.run('UPDATE blogs SET title = ? WHERE id = ?', [title, id]);

  if (content !== undefined)
    db.run('UPDATE blogs SET content = ? WHERE id = ?', [content, id]);

  if (description !== undefined)
    db.run('UPDATE blogs SET description = ? WHERE id = ?', [description, id]);

  res.json({ success: true });
});


app.delete('/api/blogs/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM blogs WHERE id = ?', id, err => {
    if (err) return res.status(500).json({ error: err.message });

    
      res.json({ success: true });
    });
  });


app.get('/api/blogs/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM blogs WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
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

