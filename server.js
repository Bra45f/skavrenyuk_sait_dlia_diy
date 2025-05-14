const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json()); 
app.use(session({ secret: 'adminsecret secret-key', resave: false, saveUninitialized: true }));

// Указываем Express, где искать статические файлы
app.use(express.static(path.join(__dirname, 'views')));

['register', 'login', 'profile', 'comments', 'admin'].forEach(route => {
  app.get(`/${route}`, (req, res) => res.sendFile(path.join(__dirname, `public/${route}.html`)));
});

// Подключаем БД
const db = new sqlite3.Database('ratings.db', (err) => {
  if (err) return console.error('Ошибка при подключении к БД:', err.message);
  console.log('Подключено к БД ratings.db');
});

// Создаем БД
const tables = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    password TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    content TEXT,
    author TEXT,
    created_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_id INTEGER,
    user_id INTEGER,
    text TEXT NOT NULL,
    FOREIGN KEY (blog_id) REFERENCES blogs(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_id INTEGER,
    user_id INTEGER,
    rating INTEGER,
    UNIQUE(blog_id, user_id),
    FOREIGN KEY (blog_id) REFERENCES blogs(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    username TEXT UNIQUE,
    password TEXT,
    secret_key TEXT
  )`
];

db.serialize(() => {
  tables.forEach(sql => db.run(sql, err => {
    if (err) console.error('Ошибка создания таблицы:', err.message);
  }));
});

const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'nikitaskavrenuk6@gmail.com',
          pass: 'mprv wyfm ejpx jspv'
        }
      });




// Маршрут для регистрации администратора
app.post('/api/admin/register', (req, res) => {
    const { email, username, password } = req.body;
    const secretKey = Math.floor(100000 + Math.random() * 900000).toString();

    const insert = `INSERT INTO admins (email, username, password, secret_key) VALUES (?, ?, ?, ?)`;
    db.run(insert, [email, username, password, secretKey], function (err) {
      if (err) {
        console.error('Ошибка при регистрации администратора:', err.message);
        return res.status(500).json({ message: 'Ошибка регистрации администратора' });
      }

      // Создание текстового файла с данными
      const fileContent = `Ваш аккаунт администратора:\n\nEmail: ${email}\nUsername: ${username}\nPassword: ${password}\nSecret Key: ${secretKey}`;
      const filePath = path.join(__dirname, `../admin_${username}_info.txt`);
      fs.writeFileSync(filePath, fileContent);

      // Настройка письма
      const mailOptions = {
        from: 'nikitaskavrenuk6@gmail.com',
        to: email,
        subject: 'Данные вашего администратора',
        text: 'Во вложении находятся данные вашего администратора.',
        attachments: [
          {
            filename: `admin_${username}_info.txt`,
            path: filePath
          }
        ]
      };

      transporter.sendMail(mailOptions, (error, info) => {
        fs.unlink(filePath, () => {}); // Удаление файла после отправки

        if (error) {
          console.error('Ошибка при отправке email:', error);
          return res.status(500).json({ message: 'Ошибка отправки письма' });
        }

        res.status(200).json({ message: 'Администратор зарегистрирован. Данные отправлены на email.' });
      });
    });
 });

// Маршрут для входа администратора
app.post('/api/admin/login', (req, res) => {
  const { username, password, secret_key } = req.body;
  db.get(`SELECT * FROM admins WHERE username = ? AND password = ? AND secret_key = ?`,
    [username, password, secret_key],
    (err, row) => {
      if (err || !row) return res.status(401).json({ message: 'Неверные данные' });
      req.session.admin = { id: row.id, username: row.username };
      res.json({ message: 'Успешный вход' });
    });
});

// Проверка сессии
app.get('/api/admin/session', (req, res) => {
  if (req.session.admin) {
    res.json({ loggedIn: true, username: req.session.admin.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// Выход из аккаунта
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Получение админитраторов
app.get('/api/admin/list', (req, res) => {
  db.all('SELECT id, username, email FROM admins', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка при получении админов' });
    res.json(rows);
  });
});

// Удаление админа
app.delete('/api/admin/:id', (req, res) => {
  const id = req.params.id;

  // Сначала получим email удаляемого админа
  db.get('SELECT email, username FROM admins WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(500).json({ message: 'Ошибка при получении администратора' });

    const { email, username } = row;

    // Удалим администратора
    db.run('DELETE FROM admins WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ message: 'Ошибка при удалении администратора' });

        const mailOptions = {
        from: 'nikitaskavrenuk6@gmail.com',
        to: email,
        subject: 'Удаление учетной записи администратора',
        text: `Здравствуйте, ${username}!\n\nВы больше не являетесь администратором на нашем сайте.\n\nС уважением,\nАдминистрация сайта`
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error('Ошибка при отправке письма:', err);
        }
      });

      res.json({ message: 'Администратор удалён и уведомлён по почте' });
    });
  });
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
        req.session.userId = user.id;
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
  const { blogId, userId, comment } = req.body;
  const timestamp = new Date().toISOString();

  db.run('INSERT INTO comments (blog_id, user_id, comment, timestamp) VALUES (?, ?, ?, ?)',
    [blogId, userId, comment, timestamp],
    function (err) {
      if (err) return res.status(500).send('Ошибка при добавлении комментария');
      res.json('/blog/' + blogId);
    }
  );
});

// Получение всех комментариев
app.get('/api/comments', (req, res) => {
    db.all('SELECT comments.comment, users.username FROM comments JOIN users ON comments.user_id = users.id', [], (err, rows) => {
        if (err) return res.json({ success: false, message: 'Ошибка загрузки комментариев' });
        res.json(rows);
    });
});

app.post('/api/ratings', (req, res) => {
  const { blogId, userId, rating } = req.body;

  db.run(`INSERT INTO ratings (blog_id, user_id, rating)
    VALUES (?, ?, ?)
    ON CONFLICT(blog_id, user_id) DO UPDATE SET rating = excluded.rating`,
[blogId, userId, rating],
    function (err) {
      if (err) return res.status(500).send('Ошибка при добавлении рейтинга');
      res.json('/blog/' + blogId);
    }
  );
});

// app.get('/api/average_rating', (req, res) => {
//     db.get('SELECT AVG(rating) AS average_rating FROM ratings', (err, row) => {
//         if (err) {
//             console.error('Ошибка при получении среднего рейтинга:', err);
//             return res.status(500).json({ success: false, error: err.message });
//         }
//         // Если рейтинг null (когда нет данных), устанавливаем 0.0
//         const averageRating = row && row.average_rating ? parseFloat(row.average_rating).toFixed(1) : "0.0";
//         res.json({ average_rating: parseFloat(averageRating) });
//     });
// });

app.get('/api/blogs', (req, res) => {
  db.all('SELECT * FROM blogs', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Добавление блога
app.post('/api/blogs', (req, res) => {
  if (!req.session.admin) return res.status(401).json({ message: 'Не авторизован' });

  const { title, description, content } = req.body;
  const author = req.session.admin.username;
  const createdAt = new Date().toISOString().split('T')[0]; // YYYY-MM-DD


  db.run(
    'INSERT INTO blogs (title, description, content, author, created_at) VALUES (?, ?, ?, ?, ?)',
    [title, description, content, author, createdAt],
    function (err) {
      if (err) return res.status(500).json({ message: 'Ошибка при добавлении блога' });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Оценка блога
app.post('/api/blogs/:id/ratings', (req, res) => {
  if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
  }

  const blogId = req.params.id;
  const userId = req.session.userId;
  const rating = parseInt(req.body.rating);

  db.run('INSERT INTO ratings (blog_id, user_id, rating) VALUES (?, ?, ?) ON CONFLICT(blog_id, user_id) DO UPDATE SET rating = excluded.rating', [blogId, userId, rating], function(err) {
      if (err) {
          res.status(500).json({ error: err.message });
      } else {
          res.json({ success: true });
      }
  });
});


// Получение средней оценки
app.get('/api/blogs/:id/average_rating', (req, res) => {
  const blogId = req.params.id;
  db.get('SELECT AVG(rating) AS average_rating FROM ratings WHERE blog_id = ?', [blogId], (err, row) => {
      if (err) {
          res.status(500).json({ error: err.message });
      } else {
          res.json({ average_rating: row.average_rating });
      }
  });
});

// Функция изменения оценки
app.get('/api/blogs/:id/user_rating', (req, res) => {
  if (!req.session.userId) {
      return res.json({ rating: null });
  }

  const blogId = req.params.id;
  const userId = req.session.userId;

  
db.get('SELECT rating FROM ratings WHERE blog_id = ? AND user_id = ?', [blogId, userId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ rating: row ? row.rating : null });
  });
});

// удаление оценки

app.delete('/api/blogs/:id/ratings', (req, res) => {
  if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
  }

  const blogId = req.params.id;
  const userId = req.session.userId;

  db.run('DELETE FROM ratings WHERE blog_id = ? AND user_id = ?', [blogId, userId], function(err) {
      if (err) {
          return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
  });
});

// Добавление комментария
app.post('/api/blogs/:id/comments', (req, res) => {
  if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
  }

  const blogId = req.params.id;
  const userId = req.session.userId;
  const text = req.body.text;

  db.run('INSERT INTO comments (blog_id, user_id, text) VALUES (?, ?, ?)', [blogId, userId, text], function(err) {
      if (err) {
          res.status(500).json({ error: err.message });
      } else {
          res.json({ success: true });
      }
  });
});


// Получение всех комментариев для блога
app.get('/api/blogs/:id/comments', (req, res) => {
  const blogId = req.params.id;
  db.all('SELECT comments.text, users.username FROM comments JOIN users ON comments.user_id = users.id WHERE blog_id = ?', [blogId], (err, rows) => {
      if (err) {
          res.status(500).json({ error: err.message });
      } else {
          res.json(rows);
      }
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

app.listen(port, () => {
 console.log(`Сервер запущен на http://localhost:${port}`);
});
