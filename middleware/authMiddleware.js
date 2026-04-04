const jwt = require("jsonwebtoken");
require("dotenv").config();

// ✅ Auth middleware
function auth(req, res, next) {
  // Expect header: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Add user info to req
    next();
  } catch (err) {
    console.log("JWT error:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = auth;