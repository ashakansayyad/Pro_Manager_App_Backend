const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const authMiddleware = (req, res, next) => {
  //   checks the authorization header to get JWT token from client
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: "User is not logged in!!!" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  } catch (err) {
    console.log(err);
    res.status(401).json({ message: "invalid token" });
  }
};

module.exports = authMiddleware;
