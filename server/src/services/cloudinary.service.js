import { cloudinary } from '../config/cloudinary.js';
import { env, features } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Upload a buffer (PDF/image/etc.) to Cloudinary and return a secure URL.
// Documents are stored as `resource_type: 'auto'` so PDFs keep previews.
export async function uploadBuffer(buffer, { folder = '', filename, mimeType } = {}) {
  if (!features.cloudinary) throw ApiError.internal('Cloudinary is not configured');

  const fullFolder = [env.CLOUDINARY_FOLDER, folder].filter(Boolean).join('/');
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: fullFolder,
        resource_type: 'auto',
        public_id: filename ? filename.replace(/\.[^./]+$/, '') : undefined,
        use_filename: true,
        unique_filename: true,
        context: mimeType ? { mimeType } : undefined,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
          pages: result.pages,
        });
      },
    );
    stream.end(buffer);
  });
}

export async function deleteAsset(publicId, resourceType = 'image') {
  if (!features.cloudinary || !publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType }).catch(() => {});
}

// Signed, time-limited URL for private previews/downloads.
export function signedUrl(publicId, options = {}) {
  return cloudinary.url(publicId, { secure: true, sign_url: true, ...options });
}

// Render the first `pages` pages of an uploaded PDF as JPG image URLs, so a
// vision model can OCR scanned documents. For non-PDF images, returns the asset
// itself. Used by the OCR pipeline when pdf-parse yields no usable text.
export function pageImageUrls(publicId, pageCount = 1) {
  if (!publicId) return [];
  const n = Math.min(Math.max(pageCount || 1, 1), 5);
  return Array.from({ length: n }, (_, i) =>
    cloudinary.url(publicId, {
      resource_type: 'image',
      format: 'jpg',
      secure: true,
      page: i + 1,
      transformation: [{ width: 1600, crop: 'limit' }, { quality: 'auto' }],
    }),
  );
}
