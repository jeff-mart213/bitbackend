const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal");
const multer = require("multer");
const path = require("path");

// --------------------
// Multer storage config for file uploads
// --------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --------------------
// Middleware to protect routes (authMiddleware)
// --------------------
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// --------------------
// GET DASHBOARD
// --------------------
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Fetch deposits & withdrawals (optional: for separate collection)
    const deposits = await Deposit.find({ user: req.userId });
    const withdrawals = await Withdrawal.find({ user: req.userId });

    res.json({
      fullName: user.fullName,
      email: user.email,
      balance: user.balance || 0,
      isVerified: user.isVerified,
      deposits,
      withdrawals
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// CREATE DEPOSIT (subdocument inside User)
// --------------------
router.post("/deposit", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId); // auth sets req.userId
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Push deposit into user.deposits array
    user.deposits.push({ amount, status: "pending" });

    await user.save();

    // Return the newly created deposit
    res.json({
      message: "Deposit submitted",
      deposit: user.deposits[user.deposits.length - 1]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// UPLOAD DEPOSIT PROOF
// --------------------
router.post("/deposit/:id/proof", authMiddleware, upload.single("proof"), async (req, res) => {
  try {
    // 1️⃣ Find the user
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2️⃣ Find the deposit subdocument by _id
    const deposit = user.deposits.id(req.params.id);
    if (!deposit) return res.status(404).json({ message: "Deposit not found" });

    // 3️⃣ Add the proof filename
    deposit.proof = req.file.filename;

    // 4️⃣ Save the user document (updates deposit subdocument)
    await user.save();

    res.json({ message: "Proof uploaded successfully", deposit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// CREATE WITHDRAWAL
// --------------------
router.post("/withdraw", authMiddleware, async (req, res) => {
  const { amount, code, ssn } = req.body;

  if (!amount || !code || !ssn) {
    return res.status(400).json({ message: "All fields required" });
  }

  try {
    const withdrawal = new Withdrawal({
      user: req.userId,
      amount,
      code,
      ssn,
      status: "pending"
    });

    await withdrawal.save();
    res.json({ message: "Withdrawal requested", withdrawal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// CONFIRM WITHDRAWAL
// --------------------
router.post("/confirm-withdrawal", authMiddleware, async (req, res) => {
  const { withdrawalId, code } = req.body;

  try {
    const withdrawal = await Withdrawal.findById(withdrawalId).populate("user");

    if (!withdrawal || withdrawal.status !== "code_sent") {
      return res.status(400).json({ message: "Invalid withdrawal" });
    }

    if (withdrawal.code !== code) {
      return res.status(400).json({ message: "Incorrect admin code" });
    }

    withdrawal.status = "approved";
    withdrawal.processedAt = new Date();

    const user = withdrawal.user;
    user.balance -= withdrawal.amount;

    await user.save();
    await withdrawal.save();

    res.json({ message: "Withdrawal confirmed!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// EXPORT ROUTER
// --------------------
module.exports = router;
