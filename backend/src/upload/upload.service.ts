import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { I18nService } from '../i18n/i18n.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    this.supabase = createClient(url, key);
  }

  /**
   * Upload file to Supabase Storage (private bucket).
   * Returns the file path (not URL) for DB storage.
   */
  async uploadFile(
    tenantId: string,
    bucket: string,
    path: string,
    file: Express.Multer.File,
    allowedMimeTypes: string[],
    maxSizeBytes: number,
    locale: string = 'en',
  ): Promise<string> {
    // Validate mime type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        this.i18n.translate('upload.errors.invalidFileType', { types: allowedMimeTypes.join(', ') }, locale),
      );
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
      const maxMB = Math.round(maxSizeBytes / (1024 * 1024));
      throw new BadRequestException(
        this.i18n.translate('upload.errors.fileTooLarge', { maxMB }, locale),
      );
    }

    // Sanitize filename
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();

    const ext = sanitizedName.split('.').pop();
    const filePath = `${path}/${tenantId}/${Date.now()}-${ext}`;

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      this.logger.error(`Upload error: ${error.message}`);
      throw new BadRequestException(
        this.i18n.translate('upload.errors.uploadFailed', {}, locale),
      );
    }

    // Return file path for DB storage (not public URL)
    return filePath;
  }

  /**
   * Generate a signed URL for a private file.
   * Expires in the specified number of seconds.
   */
  async getSignedUrl(bucket: string, filePath: string, expiresIn: number = 3600, locale: string = 'en'): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      this.logger.error(`Signed URL error: ${error.message}`);
      throw new BadRequestException(
        this.i18n.translate('upload.errors.signedUrlFailed', {}, locale),
      );
    }

    return data.signedUrl;
  }

  /**
   * Generate signed URLs for multiple files.
   */
  async getSignedUrls(bucket: string, filePaths: string[], expiresIn: number = 3600): Promise<string[]> {
    const urls: string[] = [];

    for (const path of filePaths) {
      if (!path) {
        urls.push('');
        continue;
      }
      try {
        const url = await this.getSignedUrl(bucket, path, expiresIn);
        urls.push(url);
      } catch {
        urls.push('');
      }
    }

    return urls;
  }

  /**
   * Delete file from Supabase Storage.
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(bucket).remove([path]);

    if (error) {
      this.logger.error(`Delete error: ${error.message}`);
    }
  }

  /**
   * Delete file by full path (extracts bucket from first segment).
   * Path format: "bucket-name/tenant-id/filename"
   */
  async deleteByFilePath(fullPath: string): Promise<void> {
    const parts = fullPath.split('/');
    if (parts.length < 3) {
      this.logger.warn(`Invalid file path for deletion: ${fullPath}`);
      return;
    }
    const bucket = parts[0];
    const path = parts.slice(1).join('/');
    await this.deleteFile(bucket, path);
  }
}
