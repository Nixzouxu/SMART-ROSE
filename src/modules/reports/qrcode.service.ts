import QRCode from 'qrcode';
import { env } from '@/config/env';

export const buildDeepLink = (unitCode: string): string => {
  // Deep link mengarah ke frontend untuk di-scan oleh pelapor
  return `${env.FRONTEND_URL}/lapor/${unitCode}`;
};

export const generateUnitQrCode = async (unitCode: string): Promise<Buffer> => {
  const url = buildDeepLink(unitCode);
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 1,
    width: 300,
  });
};
