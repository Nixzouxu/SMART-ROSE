import { env } from '@/config/env';
import { StorageProvider } from './storage.types';
import { MinioStorageProvider } from './providers/minioStorage.provider';
import { SupabaseStorageProvider } from './providers/supabaseStorage.provider';

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (instance) return instance;
  instance =
    env.STORAGE_PROVIDER === 'local' ? new MinioStorageProvider() : new SupabaseStorageProvider();
  return instance;
}
