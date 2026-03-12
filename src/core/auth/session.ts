import { decodeJwt as joseDecodeJwt } from 'jose';
import type { AppJwtPayload } from './types';

/**
 * Decodes a JWT token without verifying its signature.
 * Verification is handled by Supabase middleware.
 * Returns null on any decode failure.
 *
 * Edge-compatible — uses jose (no Node.js crypto APIs).
 */
export function decodeJwt(token: string): AppJwtPayload | null {
  try {
    const payload = joseDecodeJwt(token);
    return payload as unknown as AppJwtPayload;
  } catch {
    return null;
  }
}
