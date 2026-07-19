import { Client } from 'minio';
import { env } from '@/config/env';
import { StorageProvider, UploadResult } from '../storage.types';

export class MinioStorageProvider implements StorageProvider {
  private client: Client;
  private bucket: string;

  constructor() {
    if (env.STORAGE_PROVIDER !== 'local') {
      throw new Error('MinioStorageProvider hanya valid saat STORAGE_PROVIDER=local');
    }
    this.client = new Client({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
    this.bucket = env.MINIO_BUCKET;
  }

  async upload(objectPath: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
    await this.client.putObject(this.bucket, objectPath, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    const url = await this.getSignedUrl(objectPath);
    return { path: objectPath, url };
  }

  async getSignedUrl(objectPath: string, expiresInSeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectPath, expiresInSeconds);
  }

  async delete(objectPath: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectPath);
  }
}
