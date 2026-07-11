import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '@/middlewares/validate.middleware';
import { authenticate } from '@/middlewares/auth.middleware';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema';
import * as authController from './auth.controller';
import * as passwordController from './password.controller';
import * as profileController from './profile.controller';

const router = Router();

// Rate limiter khusus login (maksimal 5 percobaan per 15 menit per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login dari IP ini, silakan coba lagi setelah 15 menit',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/login/otp', loginLimiter, validate(verifyOtpSchema), authController.verifyLoginOtp);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);

// Password Management
router.post('/password/forgot', validate(forgotPasswordSchema), passwordController.forgotPassword);
router.post('/password/reset', validate(resetPasswordSchema), passwordController.resetPassword);

// Profile Management (Requires Authentication)
router.get('/profile', authenticate, profileController.getMe);
router.put('/profile', authenticate, profileController.updateMe);
router.put('/profile/password', authenticate, profileController.changePassword);

export default router;
