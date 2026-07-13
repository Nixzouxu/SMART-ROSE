import { Request, Response, NextFunction } from 'express';
import * as guidesService from './guides.service';

export const listGuidesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const kategori = req.query.kategori as string | undefined;
    const guides = await guidesService.listGuides(kategori as string);
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil daftar guide',
      data: guides,
    });
  } catch (error) {
    next(error);
  }
};

export const getGuideDetailHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const guide = await guidesService.getGuideDetail(id as string);
    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil detail guide',
      data: guide,
    });
  } catch (error) {
    next(error);
  }
};

export const searchGuidesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const guides = await guidesService.searchGuides(q as string);
    res.status(200).json({
      success: true,
      message: 'Berhasil mencari guide',
      data: guides,
    });
  } catch (error) {
    next(error);
  }
};

export const createGuideHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const guide = await guidesService.createGuide(req.body);
    res.status(201).json({
      success: true,
      message: 'Guide berhasil dibuat',
      data: guide,
    });
  } catch (error) {
    next(error);
  }
};

export const updateGuideHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const guide = await guidesService.updateGuide(id as string, req.body);
    res.status(200).json({
      success: true,
      message: 'Guide berhasil diupdate',
      data: guide,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteGuideHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await guidesService.deleteGuide(id as string);
    res.status(200).json({
      success: true,
      message: 'Guide berhasil dihapus',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
