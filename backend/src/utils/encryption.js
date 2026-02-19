const crypto = require('crypto');

const getKey = () => {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('DATA_ENCRYPTION_KEY is required');
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }

  try {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length === 32) return buf;
  } catch {
    // ignore
  }

  const salt = process.env.DATA_ENCRYPTION_SALT || 'property-management-pos';
  return crypto.scryptSync(raw, salt, 32);
};

const ALGO = 'aes-256-gcm';

const encryptBuffer = (plaintext) => {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv,
    authTag,
    algorithm: ALGO,
    keyId: process.env.DATA_ENCRYPTION_KEY_ID || null
  };
};

const decryptBuffer = ({ ciphertext, iv, authTag }) => {
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

module.exports = {
  encryptBuffer,
  decryptBuffer,
  getKey,
  ALGO
};
