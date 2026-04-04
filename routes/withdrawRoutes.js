const express = require("express");
const router = express.Router();
const Withdrawal = require("../models/Withdrawal");
const auth = require("../middleware/authMiddleware"); // ✅ fixed// ✅ correct
const User = require("../models/User");


// =====================
// 1️⃣ User Requests Withdrawal (amount + SSN)
// =====================
router.post("/request-withdrawal", auth, async (req, res) => {
  try {
    const { amount, ssn } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });
    if (amount > user.balance) return res.status(400).json({ message: "Insufficient balance" });

    const withdrawal = new Withdrawal({
      user: user._id,
      amount,
      ssn,
      status: "pending"
    });

    await withdrawal.save();

    console.log(`New withdrawal request: ${user.email}, $${amount}, SSN: ${ssn}`);

    res.status(201).json({ message: "Withdrawal request sent. Waiting for admin approval." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// 2️⃣ Admin Generates / Sends Code
// (Optional: no real admin login yet, but still works via route)
// =====================
router.put("/send-withdraw-code/:id", async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate("user");
    if (!withdrawal) return res.status(404).json({ message: "Withdrawal not found" });
    if (withdrawal.status !== "pending") return res.status(400).json({ message: "Already processed" });

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    withdrawal.code = code;
    withdrawal.status = "code_sent";
    await withdrawal.save();

    console.log(`Code for ${withdrawal.user.email}: ${code}`); // This simulates sending the code to the user

    res.json({ message: "Code sent to user", code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// 3️⃣ User Confirms Withdrawal
// =====================
router.post("/confirm-withdrawal", auth, async (req, res) => {
  try {
    const { withdrawalId, code } = req.body;

    const withdrawal = await Withdrawal.findById(withdrawalId).populate("user");
    if (!withdrawal) return res.status(404).json({ message: "Withdrawal not found" });
    if (withdrawal.user._id.toString() !== req.user.id) return res.status(403).json({ message: "Unauthorized" });
    if (withdrawal.status !== "code_sent") return res.status(400).json({ message: "Code not sent yet" });
    if (withdrawal.code !== code) return res.status(400).json({ message: "Invalid code" });

    withdrawal.status = "approved";
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    // Deduct balance
    const user = await User.findById(req.user.id);
    user.balance -= withdrawal.amount;
    await user.save();

    res.json({ message: "Withdrawal confirmed and processed", withdrawal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// CREATE NEW WITHDRAWAL
// =====================
router.post("/withdraw", auth, async (req, res) => {
  try {
    const { amount, code, ssn } = req.body;
    const userId = req.user.id;

    if (!amount || !code || !ssn) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Optional: check if user has enough balance
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (amount > user.balance) return res.status(400).json({ message: "Insufficient balance" });

    const withdrawal = new Withdrawal({
      user: userId,
      amount,
      code,
      ssn,
    });

    await withdrawal.save();

    res.status(201).json({ message: "Withdrawal submitted", withdrawal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// GET ALL WITHDRAWALS FOR CURRENT USER
// =====================
router.get("/withdrawals", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const withdrawals = await Withdrawal.find({ user: userId }).sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// ADMIN APPROVE / REJECT (OPTIONAL)
// =====================
// Example: admin approves a withdrawal
router.put("/withdrawals/:id/approve", auth, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: "Withdrawal not found" });
    if (withdrawal.status !== "pending") return res.status(400).json({ message: "Already processed" });

    // Deduct user balance
    const user = await User.findById(withdrawal.user);
    user.balance -= withdrawal.amount;
    await user.save();

    withdrawal.status = "approved";
    await withdrawal.save();

    res.json({ message: "Withdrawal approved", withdrawal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/withdrawals/:id/reject", auth, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.status(404).json({ message: "Withdrawal not found" });
    if (withdrawal.status !== "pending") return res.status(400).json({ message: "Already processed" });

    withdrawal.status = "rejected";
    await withdrawal.save();

    res.json({ message: "Withdrawal rejected", withdrawal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;