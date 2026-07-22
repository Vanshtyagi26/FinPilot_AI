require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is required in .env");
    process.exit(1);
  }
  try {
    await connectDB();
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`FinPilot AI server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start:", err.message);
    process.exit(1);
  }
}

start();
