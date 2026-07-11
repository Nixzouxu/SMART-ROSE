import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    nama: z.string().min(3, 'Nama minimal 3 karakter'),
    email: z.string().email('Format email tidak valid'),
    noPegawai: z.string().min(4, 'Nomor pegawai minimal 4 karakter'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
      .regex(/[0-9]/, 'Password harus mengandung angka'),
    unitKerja: z.string().min(1, 'Unit kerja wajib diisi'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Email atau Nomor Pegawai wajib diisi'),
    password: z.string().min(1, 'Password wajib diisi'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token wajib diisi'),
    newPassword: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
      .regex(/[0-9]/, 'Password harus mengandung angka'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    otp: z.string().length(6, 'OTP harus 6 digit'),
  }),
});
