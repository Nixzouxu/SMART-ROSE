import multer from 'multer';
import { ApiError } from '@/utils/apiError';

// Setup memori storage agar file tidak disimpan secara fisik di lokal server,
// melainkan di buffer untuk dikirim ke StorageProvider (MinIO/Supabase)
const storage = multer.memoryStorage();

// Whitelist tipe file: jpg, png, pdf, docx, xlsx
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// Maksimal ukuran 5MB
const maxSize = 5 * 1024 * 1024;

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: maxSize,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new ApiError(
          400,
          'Tipe file tidak diizinkan. Hanya menerima jpg, png, pdf, docx, atau xlsx.',
        ),
      );
    }
    cb(null, true);
  },
});

// RCA Upload Middleware (Max 10MB, no images)
const allowedRcaMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const uploadRcaMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedRcaMimeTypes.includes(file.mimetype)) {
      return cb(
        new ApiError(400, 'Tipe file RCA tidak diizinkan. Hanya menerima pdf, docx, atau xlsx.'),
      );
    }
    cb(null, true);
  },
});
