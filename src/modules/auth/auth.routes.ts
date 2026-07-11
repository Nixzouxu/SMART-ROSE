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

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - nip
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               nip:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nip
 *               - password
 *             properties:
 *               nip:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns tokens or requires OTP
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account pending approval
 */
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/login/otp:
 *   post:
 *     summary: Verify login OTP (for admins)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tempToken
 *               - otp
 *             properties:
 *               tempToken:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified, returns tokens
 *       401:
 *         description: Invalid OTP or token
 */
router.post('/login/otp', loginLimiter, validate(verifyOtpSchema), authController.verifyLoginOtp);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token in cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Returns new access token
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout user and invalidate refresh token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @openapi
 * tags:
 *   name: Password
 *   description: Password management endpoints
 */

/**
 * @openapi
 * /auth/password/forgot:
 *   post:
 *     summary: Request password reset email
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent
 *       404:
 *         description: User not found
 */
router.post('/password/forgot', validate(forgotPasswordSchema), passwordController.forgotPassword);

/**
 * @openapi
 * /auth/password/reset:
 *   post:
 *     summary: Reset password using token
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post('/password/reset', validate(resetPasswordSchema), passwordController.resetPassword);

/**
 * @openapi
 * tags:
 *   name: Profile
 *   description: User profile management
 */

/**
 * @openapi
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticate, profileController.getMe);

/**
 * @openapi
 * /auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', authenticate, profileController.updateMe);

/**
 * @openapi
 * /auth/profile/password:
 *   put:
 *     summary: Change password for authenticated user
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Incorrect old password
 *       401:
 *         description: Unauthorized
 */
router.put('/profile/password', authenticate, profileController.changePassword);

export default router;
