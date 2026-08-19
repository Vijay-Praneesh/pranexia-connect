const jwt = require("jsonwebtoken");
const env = require("../config/env");

class JwtHelper {
  generateToken(payload) {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
  }

  verifyToken(token) {
    return jwt.verify(token, env.JWT_SECRET);
  }
}

module.exports = new JwtHelper();