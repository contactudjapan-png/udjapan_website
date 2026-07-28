const sharp = require('sharp');

/**
 * Compress an uploaded image buffer without changing format.
 * - Max 1920px wide (preserves aspect ratio, never enlarges)
 * - JPEG: quality 85 with mozjpeg encoder
 * - PNG: lossless zlib level 9 (smaller file, pixel-perfect)
 * - WebP: quality 85
 * - GIF: passed through unchanged
 * Returns { buffer, mimetype } — mimetype is always unchanged.
 */
async function compressImage(buffer, mimetype) {
  if (!buffer || !mimetype) return { buffer, mimetype };
  if (mimetype === 'image/gif') return { buffer, mimetype };

  try {
    let pipeline = sharp(buffer).resize({ width: 1920, withoutEnlargement: true });

    if (mimetype === 'image/png') {
      pipeline = pipeline.png({ compressionLevel: 9 });
    } else if (mimetype === 'image/webp') {
      pipeline = pipeline.webp({ quality: 85 });
    } else {
      pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
    }

    const out = await pipeline.toBuffer();
    return { buffer: out.length < buffer.length ? out : buffer, mimetype };
  } catch (err) {
    console.warn('[compress] Skipping:', err.message);
    return { buffer, mimetype };
  }
}

module.exports = { compressImage };
