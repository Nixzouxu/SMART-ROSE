import Fuse from 'fuse.js';
import { db } from '@/config/db';

export interface MatchResult {
  knowledgeId: string;
  jawaban: string;
  confidence: number;
}

export const matchQuestion = async (userPertanyaan: string): Promise<MatchResult | null> => {
  const allKnowledge = await db.chatbotKnowledge.findMany();

  if (!allKnowledge || allKnowledge.length === 0) {
    return null;
  }

  const query = userPertanyaan.toLowerCase().trim();

  // Tahap 1: Exact Match pada kata kunci
  for (const knowledge of allKnowledge) {
    if (knowledge.kataKunci && knowledge.kataKunci.length > 0) {
      for (const keyword of knowledge.kataKunci) {
        if (query.includes(keyword.toLowerCase().trim())) {
          return {
            knowledgeId: knowledge.id,
            jawaban: knowledge.jawaban,
            confidence: 1,
          };
        }
      }
    }
  }

  // Tahap 2: Fuzzy Match menggunakan Fuse.js
  const fuseOptions = {
    includeScore: true,
    threshold: 0.4,
    keys: ['pertanyaan', 'kataKunci'],
  };

  const fuse = new Fuse(allKnowledge, fuseOptions);
  const results = fuse.search(query);

  if (results.length > 0) {
    const bestMatch = results[0];
    const score = bestMatch.score ?? 1;
    const confidence = 1 - score;

    if (confidence >= 0.6) {
      return {
        knowledgeId: bestMatch.item.id,
        jawaban: bestMatch.item.jawaban,
        confidence,
      };
    }
  }

  return null;
};
