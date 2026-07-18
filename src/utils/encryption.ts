import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is missing.');
  }
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  if (key.length === 32) {
    return Buffer.from(key);
  }
  throw new Error('ENCRYPTION_KEY must be exactly 32 plain characters or 64 hex characters long.');
};

export const encryptText = (text: string): string => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // Format: iv:authTag:encryptedText
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Encryption failed:', error);
    throw error;
  }
};

export const decryptText = (cipherText: string): string => {
  try {
    if (!cipherText) return cipherText;

    // If it doesn't look like our encrypted format, just return it (backward compatibility for old plain text)
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      return cipherText;
    }

    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    // Fallback on error (could be malformed data or old text containing colons)
    return cipherText;
  }
};
