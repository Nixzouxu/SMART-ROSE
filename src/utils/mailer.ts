import nodemailer from 'nodemailer';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE || false,
  auth:
    env.SMTP_USER && env.SMTP_PASS
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
});

export const sendMail = async (to: string, subject: string, text: string, html?: string) => {
  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM || 'noreply@smartrose.local',
      to,
      subject,
      text,
      html,
    });
    logger.info({ messageId: info.messageId }, 'Email sent successfully');
    return info;
  } catch (error) {
    logger.error({ error }, 'Failed to send email');
    throw error;
  }
};
