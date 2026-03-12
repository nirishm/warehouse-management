import { NextRequest, NextResponse } from 'next/server';
import { ipRateLimiter, tenantRateLimiter } from './rate-limiter';

export async function checkRateLimit(
  req: NextRequest,
): Promise<NextResponse | null> {
  // Skip if rate limiters aren't configured
  if (!ipRateLimiter || !tenantRateLimiter) return null;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
  const tenantId = req.headers.get('x-tenant-id') ?? 'anonymous';

  // Check IP rate limit
  const ipResult = await ipRateLimiter.limit(ip);
  if (!ipResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(ipResult.limit),
          'X-RateLimit-Remaining': String(ipResult.remaining),
          'X-RateLimit-Reset': String(ipResult.reset),
          'Retry-After': String(Math.ceil((ipResult.reset - Date.now()) / 1000)),
        },
      },
    );
  }

  // Check tenant rate limit
  const tenantResult = await tenantRateLimiter.limit(tenantId);
  if (!tenantResult.success) {
    return NextResponse.json(
      { error: 'Tenant rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(tenantResult.limit),
          'X-RateLimit-Remaining': String(tenantResult.remaining),
          'X-RateLimit-Reset': String(tenantResult.reset),
          'Retry-After': String(Math.ceil((tenantResult.reset - Date.now()) / 1000)),
        },
      },
    );
  }

  return null; // Passed both limits
}
