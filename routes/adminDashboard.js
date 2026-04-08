const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const User = require("../models/User");
const Withdrawal = require("../models/Withdrawal");

// GET all users
router.get("/users", adminAuth, async (req, res) => {
  try {
    const users = await User.find().select("fullName email balance ssn");
res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET pending deposits
// GET pending deposits
router.get("/deposits", adminAuth, async (req, res) => {
  try {
    const users = await User.find({ "deposits.0": { $exists: true } }); // only users with deposits
    const pendingDeposits = [];

    users.forEach(user => {
      user.deposits.forEach(deposit => {
        if (deposit.status === "pending") {
          pendingDeposits.push({
            user: { _id: user._id, fullName: user.fullName, email: user.email },
            deposit: { 
              _id: deposit._id, 
              amount: deposit.amount, 
              status: deposit.status,
              method: deposit.method || "-",  // optional if you have it
              proof: deposit.proof || "-"     // optional if you have it
            }
          });
        }
      });
    });

    res.json(pendingDeposits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET pending withdrawals
// GET pending withdrawals
router.get("/withdrawals", adminAuth, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ status: { $in: ["pending", "code_sent"] } }).populate("user");
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// APPROVE DEPOSIT
// APPROVE DEPOSIT
router.put("/deposits/:userId/approve/:depositId", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const deposit = user.deposits.id(req.params.depositId);

    if (!deposit || deposit.status !== "pending") {
      return res.status(400).json({ message: "Invalid deposit" });
    }

    deposit.status = "approved";
    user.balance += deposit.amount;          // update user balance
    user.totalDeposit = (user.totalDeposit || 0) + deposit.amount; // update total deposit
    await user.save();

    res.json({ message: "Deposit approved", deposit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GENERATE/SEND WITHDRAWAL CODE
router.put("/withdrawals/:id/send-code", adminAuth, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate("user");
    if (!withdrawal || withdrawal.status !== "pending") return res.status(400).json({ message: "Invalid withdrawal" });

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    withdrawal.code = code;
    withdrawal.status = "code_sent";
    await withdrawal.save();

    console.log(`Code for ${withdrawal.user.email}: ${code}`);

    res.json({ message: "Code sent", code });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// APPROVE WITHDRAWAL
router.put("/withdrawals/:id/approve", adminAuth, async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate("user");
    if (!withdrawal || withdrawal.status !== "code_sent") return res.status(400).json({ message: "Invalid withdrawal" });

    withdrawal.status = "approved";
    withdrawal.processedAt = new Date();

    const user = withdrawal.user;
    user.balance -= withdrawal.amount;
    await user.save();
    await withdrawal.save();

    res.json({ message: "Withdrawal approved", withdrawal });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE USER
router.delete("/users/:id", adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    await User.findByIdAndDelete(userId);

    res.json({ message: "User deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

module.exports = router;
