require('dotenv').config();
const express = require('express');
const pgp = require('pg-promise')();
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

const db = pgp('postgres://username:password@localhost:5432/planets'); 

app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const SECRET = process.env.SECRET;

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: SECRET,
};

passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
  try {
    const user = await db.oneOrNone('SELECT * FROM users WHERE id=$1', [jwt_payload.id]);
    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  } catch (err) {
    return done(err, false);
  }
}));

app.use(passport.initialize());

app.get('/planets', async (req, res) => {
  try {
    const planets = await db.any('SELECT * FROM planets');
    res.json(planets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/planets/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const planet = await db.one('SELECT * FROM planets WHERE id=$1', [id]);
    res.json(planet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/planets', async (req, res) => {
  const { name } = req.body;
  try {
    await db.none('INSERT INTO planets (name) VALUES ($1)', [name]);
    res.status(201).json({ message: 'Planet added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/planets/:id', async (req, res) => {
  const id = req.params.id;
  const { name } = req.body;
  try {
    await db.none('UPDATE planets SET name=$2 WHERE id=$1', [id, name]);
    res.json({ message: 'Planet updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/planets/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await db.none('DELETE FROM planets WHERE id=$1', [id]);
    res.json({ message: 'Planet deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/planets/:id/image', upload.single('image'), async (req, res) => {
  const id = req.params.id;
  const imagePath = req.file.path;

  try {
    await db.none('UPDATE planets SET image=$2 WHERE id=$1', [id, imagePath]);
    res.json({ message: 'Image uploaded and path saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.none('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db.one('SELECT * FROM users WHERE username=$1', [username]);
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1h' });
      await db.none('UPDATE users SET token=$2 WHERE id=$1', [user.id, token]);
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/protected', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ message: 'You have accessed a protected route!', user: req.user });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});