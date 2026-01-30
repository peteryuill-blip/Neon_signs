/**
 * Photo Upload Helper for Materials and Works
 * Handles S3 upload with proper key generation
 */

import { storagePut } from './storage';

/**
 * Upload photo to S3 with random suffix to prevent enumeration
 * Returns { url, key } for database storage
 */
export async function uploadPhoto(
  userId: number,
  fileBuffer: Buffer,
  fileName: string,
  type: 'material' | 'work'
): Promise<{ url: string; key: string }> {
  // Generate random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  
  // Create S3 key with user ID, type, and random suffix
  const fileKey = `${userId}-${type}s/${fileName}-${randomSuffix}.webp`;
  
  // Upload to S3
  const { url } = await storagePut(fileKey, fileBuffer, 'image/webp');
  
  return { url, key: fileKey };
}
