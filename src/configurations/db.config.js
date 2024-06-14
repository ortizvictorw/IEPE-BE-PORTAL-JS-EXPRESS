const mongoose = require('mongoose');

const db = async () => {
  try {
    await mongoose.connect(`mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASSWORD}@iepe.bkgwmcp.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=IEPE`);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.log(err);
  }
};

module.exports = db;
