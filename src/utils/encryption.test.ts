import { encryptText, decryptText } from './encryption';

describe('Utilitas Enkripsi (AES-256-GCM)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32 bytes valid key
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('harus berhasil mengenkripsi data', () => {
    const plainText = 'Rahasia Medis 123';
    const cipherText = encryptText(plainText);

    expect(cipherText).not.toBe(plainText);
    expect(cipherText.split(':').length).toBe(3); // iv:authTag:encrypted
  });

  it('harus berhasil mendekripsi data kembali ke bentuk aslinya', () => {
    const plainText = 'Data Pasien Kritis';
    const cipherText = encryptText(plainText);
    const decryptedText = decryptText(cipherText);

    expect(decryptedText).toBe(plainText);
  });

  it('harus menghasilkan cipher berbeda meskipun datanya sama (karena IV acak)', () => {
    const plainText = 'Identitas Sama';
    const cipher1 = encryptText(plainText);
    const cipher2 = encryptText(plainText);

    expect(cipher1).not.toBe(cipher2);
  });

  it('harus gagal jika kunci AES salah/diubah di tengah jalan', () => {
    const plainText = 'Rahasia';
    const cipherText = encryptText(plainText);

    // Ubah key
    process.env.ENCRYPTION_KEY = '09876543210987654321098765432109';
    // DecryptText ada fallback, jadi tidak akan throw error, tapi mengembalikan teks asli (ciphernya sendiri) jika gagal
    // karena try-catch di dalam fungsi
    const decrypted = decryptText(cipherText);
    expect(decrypted).toBe(cipherText); // karena fallback
  });

  it('Skenario Fallback: harus mengembalikan string utuh jika mendekripsi data plaintext mentah (Data Lama)', () => {
    const legacyData = 'Ini Adalah Data Lama Sebelum Fase 7';
    const result = decryptText(legacyData);

    // Karena format bukan iv:auth:cipher, fungsi harus mendeteksinya dan langsung return tanpa crash
    expect(result).toBe(legacyData);
  });

  it('Skenario Fallback: tidak crash jika tag autentikasi corrupt', () => {
    const plainText = 'Rahasia';
    const cipherText = encryptText(plainText);

    const parts = cipherText.split(':');
    // Rusak auth tag sedikit (ganti beberapa karakter)
    parts[1] = '00000000000000000000000000000000';
    const corruptCipher = parts.join(':');

    const result = decryptText(corruptCipher);
    // Karena auth tag salah, crypto akan melempar error di .final() yang ditangkap blok catch, lalu me-return fallback (string asal)
    expect(result).toBe(corruptCipher);
  });
});
