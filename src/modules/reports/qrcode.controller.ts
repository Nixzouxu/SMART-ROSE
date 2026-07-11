import { Request, Response, NextFunction } from 'express';
import { generateUnitQrCode, buildDeepLink } from './qrcode.service';

export const scan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unitCode = req.params.unitCode as string;
    const url = buildDeepLink(unitCode);
    res.redirect(url);
  } catch (error) {
    next(error);
  }
};

export const getUnitQrImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unitCode = req.params.unitCode as string;
    const qrBuffer = await generateUnitQrCode(unitCode);

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename=QR-${unitCode}.png`);
    res.send(qrBuffer);
  } catch (error) {
    next(error);
  }
};
