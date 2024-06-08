const pgp = require('pg-promise')();
const db = pgp('postgres://username:password@localhost:5432/planets'); 

async function setupDb() {
  try {
    await db.none(`
      DROP TABLE IF EXISTS planets;
      CREATE TABLE planets(
        id SERIAL NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        image TEXT
      );

      DROP TABLE IF EXISTS users;
      CREATE TABLE users (
        id SERIAL NOT NULL PRIMARY KEY,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        token TEXT
      );
    `);

    await db.none('INSERT INTO planets (name) VALUES ($1)', ['Earth']);
    await db.none('INSERT INTO planets (name) VALUES ($1)', ['Mars']);
    
    console.log('Database setup complete');
  } catch (err) {
    console.error('Error setting up the database:', err);
  }
}

setupDb();