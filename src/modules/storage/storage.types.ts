export interface UploadResult {
  path: string;
  url: string;
}

export interface StorageProvider {
  upload(objectPath: string, buffer: Buffer, contentType: string): Promise<UploadResult>;
  getSignedUrl(objectPath: string, expiresInSeconds?: number): Promise<string>;
  delete(objectPath: string): Promise<void>;
}
