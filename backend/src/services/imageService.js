const sharp = require('sharp');
const uuidv4 = require('uuid').v4;
const fs = require('fs').promises;
const path = require('path');

class ImageService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads/properties');
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
    this.allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    this.maxDimensions = { width: 4000, height: 4000 };
  }

  /**
   * Validate image file before processing
   */
  validateImage(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Check MIME type
    if (!this.allowedMimes.includes(file.mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${this.allowedMimes.join(', ')}`);
    }

    return true;
  }

  /**
   * Process and save image with optimization
   */
  async processImage(file) {
    this.validateImage(file);

    const imageId = uuidv4();
    const timestamp = Date.now();
    const ext = this.getExtension(file.mimetype);
    const filename = `${imageId}-${timestamp}.${ext}`;
    const filepath = path.join(this.uploadDir, filename);

    try {
      // Ensure upload directory exists
      await fs.mkdir(this.uploadDir, { recursive: true });

      // Process and optimize image
      let pipeline = sharp(file.buffer)
        .rotate() // Auto-rotate based on EXIF
        .withMetadata(); // Preserve metadata

      // Resize if dimensions exceed max
      const metadata = await sharp(file.buffer).metadata();
      
      if (metadata.width > this.maxDimensions.width || metadata.height > this.maxDimensions.height) {
        pipeline = pipeline.resize(this.maxDimensions.width, this.maxDimensions.height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert to optimal format and compress
      if (file.mimetype === 'image/jpeg') {
        pipeline = pipeline.jpeg({ quality: 85, progressive: true });
      } else if (file.mimetype === 'image/png') {
        pipeline = pipeline.png({ compressionLevel: 8 });
      } else if (file.mimetype === 'image/webp') {
        pipeline = pipeline.webp({ quality: 85 });
      }

      // Save processed image
      const processedBuffer = await pipeline.toBuffer();
      await fs.writeFile(filepath, processedBuffer);

      // Get final image metadata
      const finalMetadata = await sharp(processedBuffer).metadata();
      const stats = await fs.stat(filepath);

      return {
        id: imageId,
        url: `/uploads/properties/${filename}`,
        filename,
        size: stats.size,
        originalSize: file.size,
        mime_type: file.mimetype,
        width: finalMetadata.width,
        height: finalMetadata.height,
        uploaded_at: new Date().toISOString(),
        compression_ratio: ((1 - stats.size / file.size) * 100).toFixed(2)
      };
    } catch (error) {
      // Clean up file if processing failed
      try {
        await fs.unlink(filepath);
      } catch (e) {
        // Ignore cleanup errors
      }
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Process multiple images
   */
  async processMultipleImages(files) {
    if (!Array.isArray(files)) {
      files = [files];
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.processImage(file);
        results.push(result);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    return { results, errors };
  }

  /**
   * Delete image file from disk
   */
  async deleteImage(imageUrl) {
    try {
      const filename = imageUrl.split('/').pop();
      const filepath = path.join(this.uploadDir, filename);
      
      // Verify file is within upload directory (security check)
      const realPath = await fs.realpath(filepath);
      const realUploadDir = await fs.realpath(this.uploadDir);
      
      if (!realPath.startsWith(realUploadDir)) {
        throw new Error('Invalid file path');
      }

      await fs.unlink(filepath);
      return true;
    } catch (error) {
      console.error(`Error deleting image: ${error.message}`);
      // Don't throw - image might already be deleted
      return false;
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(imageUrls) {
    const results = await Promise.all(
      imageUrls.map(url => this.deleteImage(url))
    );
    return results.filter(r => r).length;
  }

  /**
   * Get file extension from MIME type
   */
  getExtension(mimetype) {
    const mimeMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    return mimeMap[mimetype] || 'jpg';
  }

  /**
   * Generate thumbnail for image
   */
  async generateThumbnail(imageUrl, width = 200, height = 200) {
    try {
      const filename = imageUrl.split('/').pop();
      const filepath = path.join(this.uploadDir, filename);
      const thumbDir = path.join(this.uploadDir, 'thumbnails');
      const thumbFilename = `thumb-${width}x${height}-${filename}`;
      const thumbPath = path.join(thumbDir, thumbFilename);

      // Check if thumbnail already exists
      try {
        await fs.access(thumbPath);
        return `/uploads/properties/thumbnails/${thumbFilename}`;
      } catch {
        // Thumbnail doesn't exist, create it
      }

      // Ensure thumbnail directory exists
      await fs.mkdir(thumbDir, { recursive: true });

      // Generate thumbnail
      await sharp(filepath)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .toFile(thumbPath);

      return `/uploads/properties/thumbnails/${thumbFilename}`;
    } catch (error) {
      console.error(`Error generating thumbnail: ${error.message}`);
      return imageUrl; // Return original if thumbnail fails
    }
  }

  /**
   * Get image dimensions and metadata without processing
   */
  async getImageMetadata(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        hasAlpha: metadata.hasAlpha,
        colorspace: metadata.colorspace
      };
    } catch (error) {
      throw new Error(`Failed to read image metadata: ${error.message}`);
    }
  }
}

module.exports = new ImageService();
