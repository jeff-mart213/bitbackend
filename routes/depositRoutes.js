const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/authMiddleware"); // ✅ correct path

// --------------------
// CREATE DEPOSIT
// --------------------
router.post("/", auth, async (req, res) => {
  try {
    const { amount, method, proof } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    const deposit = {
      amount,
      method,
      proof,
      status: "pending",
      createdAt: new Date()
    };

    user.deposits.push(deposit);
    await user.save();

    res.json({ message: "Deposit created", deposit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------
// GET USER DEPOSITS
// --------------------
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("deposits");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.deposits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;