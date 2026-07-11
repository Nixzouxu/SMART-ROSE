import { Client } from 'minio';

const minioClient = new Client({
  endPoint: '127.0.0.1',
  port: 9000,
  useSSL: false,
  accessKey: 'smartrose_admin',
  secretKey: 'smartrose_minio_pass'
});

async function setup() {
  const bucketName = 'report-attachments';
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (exists) {
      console.log(`Bucket ${bucketName} sudah ada.`);
    } else {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`Bucket ${bucketName} berhasil dibuat.`);
      
      // Set policy public untuk bisa download jika dibutuhkan
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Action: ['s3:GetObject'],
            Effect: 'Allow',
            Principal: '*',
            Resource: [`arn:aws:s3:::${bucketName}/*`]
          }
        ]
      };
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`Policy public read untuk bucket ${bucketName} berhasil diset.`);
    }
  } catch (err) {
    console.error('Gagal setup MinIO:', err);
  }
}

setup();
