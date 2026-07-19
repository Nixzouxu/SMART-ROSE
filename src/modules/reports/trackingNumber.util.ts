import { db } from '@/config/db';

export const generateTrackingNumber = async (): Promise<string> => {
  return await db.$transaction(async (tx) => {
    const currentYear = new Date().getFullYear().toString();
    const prefix = `SR-${currentYear}-`;

    const lastReport = await tx.report.findFirst({
      where: {
        trackingNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        trackingNumber: 'desc',
      },
      select: {
        trackingNumber: true,
      },
    });

    let nextSequence = 1;

    if (lastReport && lastReport.trackingNumber) {
      const parts = lastReport.trackingNumber.split('-');
      if (parts.length === 3) {
        const lastSequence = parseInt(parts[2], 10);
        if (!isNaN(lastSequence)) {
          nextSequence = lastSequence + 1;
        }
      }
    }

    const sequenceString = nextSequence.toString().padStart(6, '0');
    return `${prefix}${sequenceString}`;
  });
};
