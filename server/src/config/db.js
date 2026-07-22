const mongoose = require('mongoose');
console.log("MONGODB_URI =", process.env.MONGODB_URI);
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  await mongoose.connect(uri);
}

module.exports = { connectDB };
