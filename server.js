require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// ===== CREATE APP =====
const app = express();

// ===== MIDDLEWARE =====
app.use(cors({
  origin: "https://lightgreen-cassowary-905296.hostingersite.com", // frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Optional: prevent favicon 404
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ===== ROUTES =====
const authRoutes = require('./routes/authRoutes');
const userRoutes = require("./routes/userRoutes");
const withdrawRoutes = require("./routes/withdrawRoutes");
const adminAuthRoutes = require("./routes/adminAuth");
const adminDashboardRoutes = require("./routes/adminDashboard");
const depositRoutes = require("./routes/depositRoutes");

// User routes
app.use('/api/auth', authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/user", withdrawRoutes);
app.use("/api/deposit", depositRoutes);

// Admin routes
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);

// ===== CONNECT TO MONGO =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err));

  // ===== START SERVER =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
