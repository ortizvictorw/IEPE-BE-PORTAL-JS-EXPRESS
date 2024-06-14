const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const memberRouter = require('./routes/member');
const db = require('./src/configurations/db.config');

dotenv.config({ path: '.env' });

const app = express();

(async () => {
  try {
    await db();
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
})();

app.use(express.json({ extended: false }));
app.use(cors());

// Rutas
app.use('/members', memberRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

module.exports = app;
