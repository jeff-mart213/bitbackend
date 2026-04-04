const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// ADMIN LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("EMAIL ENTERED:", email);
    console.log("PASSWORD ENTERED:", password);

    const admin = await Admin.findOne({ email });

    console.log("ADMIN FROM DB:", admin);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await admin.comparePassword(password);

    console.log("PASSWORD MATCH:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Admin logged in", token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// CREATE ADMIN (TEMP - REMOVE LATER)
router.post("/create-admin", async (req, res) => {
  try {
    const { email, password } = req.body;

    const adminExists = await Admin.findOne({ email });
    if (adminExists) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const admin = new Admin({ email, password });
    await admin.save();

    res.json({ message: "Admin created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;