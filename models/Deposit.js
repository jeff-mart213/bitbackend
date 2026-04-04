const mongoose = require("mongoose");

const DepositSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: { type: Number, required: true },
  method: { type: String, required: true },
  proof: { type: String }, // filename or URL
  status: { type: String, default: "pending" }, // pending / approved / rejected
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Deposit", DepositSchema);