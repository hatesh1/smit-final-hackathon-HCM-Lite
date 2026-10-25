
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

function signAccessToken(user) {
  const userId = user?._id ?? user?.id;

  if (!userId) {
    throw new Error('Cannot create access token: user ID is missing');
  }

  return jwt.sign(
    {
      sub: userId.toString(),
      role: user.role,
      employeeId: user.employeeId,
    },
    env.jwt.accessSecret,
    {
      expiresIn: env.jwt.accessExpires,
    }
  );
}

function signRefreshToken(user) {
  const userId = user?._id ?? user?.id;

  if (!userId) {
    throw new Error('Cannot create refresh token: user ID is missing');
  }

  return jwt.sign(
    {
      id: userId.toString(),
      sub: userId.toString(),
      type: 'refresh',
    },
    env.jwt.refreshSecret,
    {
      expiresIn: env.jwt.refreshExpires,
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  sha256,
  randomToken,
};
