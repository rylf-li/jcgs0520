const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function looksHashed(password) {
  return typeof password === 'string' && password.startsWith('$2');
}

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(plainText, storedPassword) {
  if (!storedPassword) return false;
  // 仅使用 bcrypt 比较，移除明文回退（安全加固）
  return bcrypt.compare(plainText, storedPassword);
}

module.exports = {
  hashPassword,
  looksHashed,
  verifyPassword,
};
