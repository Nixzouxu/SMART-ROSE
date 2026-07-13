import { z } from 'zod';

export const askChatbotSchema = z.object({
  body: z.object({
    pertanyaan: z.string().min(3).max(500),
  }),
});

export const answerLogSchema = z.object({
  body: z.object({
    jawaban: z.string().min(3).max(2000),
  }),
});
