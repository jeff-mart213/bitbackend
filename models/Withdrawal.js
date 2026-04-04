const mongoose = require("mongoose");

const WithdrawalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: { type: Number, required: true },
  ssn: { type: String, required: true },
  status: { type: String, default: "pending" }, // pending / code_sent / approved / rejected
  code: { type: String }, // sent by admin
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
});

module.exports = mongoose.model("Withdrawal", WithdrawalSchema);