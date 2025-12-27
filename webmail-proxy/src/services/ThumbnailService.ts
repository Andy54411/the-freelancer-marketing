import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const THUMBNAIL_DIR = '/opt/taskilo/webmail-proxy/data/drive-thumbnails';

// Ensure thumbnail directory exists
try {
  if (!fs.existsSync(THUMBNAIL_DIR)) {
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
  }
} catch {
  // May fail on local dev, that's ok
}

export class ThumbnailService {
  /**
   * Get or generate thumbnail for a file
   * For images: return original file (browsers can resize)
   * For videos: generate thumbnail with ffmpeg
   * For PDFs: return null (frontend renders with PDF.js)
   */
  static async getThumbnail(
    fileId: string,
    filePath: string,
    mimeType: string
  ): Promise<Buffer | null> {
    const thumbnailPath = path.join(THUMBNAIL_DIR, `${fileId}.jpg`);

    // Check if thumbnail already exists
    try {
      if (fs.existsSync(thumbnailPath)) {
        return fs.readFileSync(thumbnailPath);
      }
    } catch {
      // Ignore
    }

    // For images, return the original file
    if (mimeType.startsWith('image/') && !mimeType.includes('heic') && !mimeType.includes('heif')) {
      try {
        if (fs.existsSync(filePath)) {
          return fs.readFileSync(filePath);
        }
      } catch {
        // Ignore
      }
    }

    // For videos, generate thumbnail with ffmpeg
    if (mimeType.startsWith('video/')) {
      try {
        await this.generateVideoThumbnail(filePath, thumbnailPath);
        if (fs.existsSync(thumbnailPath)) {
          return fs.readFileSync(thumbnailPath);
        }
      } catch (err) {
        console.error('[ThumbnailService] Video thumbnail generation failed:', err);
      }
    }

    // PDFs and other files: no thumbnail available from server
    return null;
  }

  /**
   * Generate video thumbnail using ffmpeg
   */
  private static async generateVideoThumbnail(
    videoPath: string,
    outputPath: string
  ): Promise<void> {
    // Extract frame at 1 second, scale to 400px width maintaining aspect ratio
    const command = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=400:-1" -q:v 2 "${outputPath}" -y`;
    
    await execAsync(command, { timeout: 30000 });
  }

  /**
   * Delete thumbnail when file is deleted
   */
  static deleteThumbnail(fileId: string): void {
    const thumbnailPath = path.join(THUMBNAIL_DIR, `${fileId}.jpg`);
    try {
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    } catch {
      // Ignore
    }
  }
}
