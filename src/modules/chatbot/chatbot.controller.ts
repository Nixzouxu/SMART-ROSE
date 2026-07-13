import { Request, Response, NextFunction } from 'express';
import * as chatbotService from './chatbot.service';

export const askChatbotHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pertanyaan } = req.body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;

    const result = await chatbotService.askChatbot(userId, pertanyaan);

    res.status(200).json({
      success: true,
      message: 'Berhasil memproses pertanyaan chatbot',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingChatbotLogsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await chatbotService.getPendingChatbotLogs(page, limit);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil log chatbot yang menunggu admin',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const answerChatbotLogHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { logId } = req.params;
    const { jawaban } = req.body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminId = (req as any).user?.userId as string;

    const result = await chatbotService.answerChatbotLog(logId as string, adminId, jawaban);

    res.status(200).json({
      success: true,
      message: 'Berhasil menjawab pertanyaan chatbot',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getChatbotHistoryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.userId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await chatbotService.getChatbotHistory(userId, page, limit);

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil riwayat chatbot',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
