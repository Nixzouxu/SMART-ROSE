import multer from 'multer';
import { ApiError } from '@/utils/apiError';

// Setup memori storage agar file tidak disimpan secara fisik di lokal server,
// melainkan di buffer untuk dikirim ke StorageProvider (MinIO/Supabase)
const storage = multer.memoryStorage();

// Whitelist tipe file: jpg, png, pdf
const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

// Maksimal ukuran 5MB
const maxSize = 5 * 1024 * 1024;

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: maxSize,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Tipe file tidak diizinkan. Hanya menerima jpg, png, atau pdf.'));
    }
    cb(null, true);
  },
});
