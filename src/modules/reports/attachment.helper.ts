import { getStorageProvider } from '@/modules/storage/storage.factory';

export const refreshAttachmentUrls = async <T extends { objectPath: string; fileUrl: string }>(
  attachments: T[],
): Promise<T[]> => {
  if (!attachments || attachments.length === 0) return attachments;

  const storageProvider = getStorageProvider();

  return Promise.all(
    attachments.map(async (att) => ({
      ...att,
      fileUrl: await storageProvider.getSignedUrl(att.objectPath),
    })),
  );
};
