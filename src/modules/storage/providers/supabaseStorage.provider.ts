import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from '@/config/env';
import { StorageProvider, UploadResult } from '../storage.types';

export class SupabaseStorageProvider implements StorageProvider {
  private client;
  private bucket: string;

  constructor() {
    if (env.STORAGE_PROVIDER !== 'supabase') {
      throw new Error('SupabaseStorageProvider hanya valid saat STORAGE_PROVIDER=supabase');
    }
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      realtime: { transport: ws as any },
    });
    this.bucket = env.SUPABASE_STORAGE_BUCKET;
  }

  async upload(objectPath: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(objectPath, buffer, { contentType, upsert: false });
    if (error) throw new Error(`Gagal upload ke Supabase Storage: ${error.message}`);
    const url = await this.getSignedUrl(objectPath);
    return { path: objectPath, url };
  }

  async getSignedUrl(objectPath: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(objectPath, expiresInSeconds);
    if (error || !data) throw new Error('Gagal membuat signed URL');
    return data.signedUrl;
  }

  async delete(objectPath: string): Promise<void> {
    await this.client.storage.from(this.bucket).remove([objectPath]);
  }
}
