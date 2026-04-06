import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET', 'oceanus-uploads');
    this.publicUrl = this.config.get<string>('S3_PUBLIC_URL', '');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: this.config.get<string>('S3_ENDPOINT', ''),
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY', ''),
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY', ''),
      },
    });
  }

  /**
   * Upload a file buffer to R2/S3 and return the public URL + metadata.
   */
  async upload(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; key: string; originalName: string; mimeType: string; size: number }> {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    const key = `${folder}/${uniqueName}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = this.publicUrl
      ? `${this.publicUrl}/${key}`
      : `/${key}`;

    this.logger.log(`Uploaded ${file.originalname} → ${key}`);

    return {
      url,
      key,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Delete a file from R2/S3 by its key.
   */
  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    this.logger.log(`Deleted ${key}`);
  }
}
