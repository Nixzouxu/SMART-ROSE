import { matchQuestion } from './chatbot.matcher';
import { db } from '../../config/db';

jest.mock('../../config/db', () => ({
  db: {
    chatbotKnowledge: {
      findMany: jest.fn(),
    },
  },
}));

describe('Chatbot Matcher NLP Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockKnowledge = [
    {
      id: 'k1',
      pertanyaan: 'Bagaimana cara login?',
      jawaban: 'Untuk login, gunakan NIP dan password Anda di halaman utama.',
      kataKunci: ['cara login', 'lupa password'],
    },
    {
      id: 'k2',
      pertanyaan: 'Siapa direktur RS?',
      jawaban: 'Direktur RS saat ini adalah Dr. Budi.',
      kataKunci: ['direktur', 'pimpinan'],
    },
  ];

  it('harus mengembalikan jawaban dengan confidence 1 untuk kecocokan kata kunci pasti (exact match)', async () => {
    (db.chatbotKnowledge.findMany as jest.Mock).mockResolvedValue(mockKnowledge);

    const result = await matchQuestion('halo admin, bagaimana cara login ke sistem?');

    expect(result).not.toBeNull();
    expect(result?.knowledgeId).toBe('k1');
    expect(result?.jawaban).toContain('Untuk login');
    expect(result?.confidence).toBe(1);
  });

  it('harus mengembalikan jawaban dengan skor fuzziness yang valid meskipun ada sedikit typo', async () => {
    (db.chatbotKnowledge.findMany as jest.Mock).mockResolvedValue(mockKnowledge);

    // Typo: "dirktur" instead of "direktur", but close to "Siapa direktur RS?"
    // The fuzzy search threshold is 0.4 (score <= 0.4 implies confidence >= 0.6).
    const result = await matchQuestion('siapa dirktur rs?');

    expect(result).not.toBeNull();
    expect(result?.knowledgeId).toBe('k2');
    expect(result?.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result?.confidence).toBeLessThan(1); // karena bukan exact match kata kunci
  });

  it('harus memicu fallback (mengembalikan null) jika pertanyaan melenceng dan skor di bawah threshold', async () => {
    (db.chatbotKnowledge.findMany as jest.Mock).mockResolvedValue(mockKnowledge);

    const result = await matchQuestion('apa menu makan siang hari ini di kantin?');

    // Completely irrelevant, should return null
    expect(result).toBeNull();
  });
});
