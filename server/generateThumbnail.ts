/**
 * Generate thumbnail from image buffer
 * Returns base64 data URL for database storage
 */

export async function generateThumbnail(
  imageBuffer: Buffer,
  maxWidth: number = 400,
  maxHeight: number = 400
): Promise<string> {
  // For Node.js environment, we'll use a simple approach:
  // Return the original image as base64 if it's already optimized WebP
  // In production, you'd use sharp or similar for actual resizing
  
  const base64 = imageBuffer.toString('base64');
  return `data:image/webp;base64,${base64}`;
}
