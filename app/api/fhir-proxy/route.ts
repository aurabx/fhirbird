import { NextRequest, NextResponse } from 'next/server';

// Rate limiting: simple in-memory store (use Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

// Allowed FHIR server domains (empty = allow all)
// Add domains here to restrict proxy usage
const ALLOWED_DOMAINS = process.env.ALLOWED_FHIR_DOMAINS
  ? process.env.ALLOWED_FHIR_DOMAINS.split(',').map(d => d.trim())
  : [];

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    console.warn(`[FHIR Proxy] Rate limit exceeded for IP: ${ip}`);
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get('url');
  const headersParam = searchParams.get('headers');

  // Log the request
  console.log(`[FHIR Proxy] Request from ${ip} to ${targetUrl}`);

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate URL to prevent proxy abuse
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Only allow HTTP/HTTPS
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Only HTTP/HTTPS protocols allowed' }, { status: 400 });
  }

  // Block private/local IP ranges in production (prevents SSRF attacks)
  if (process.env.NODE_ENV === 'production') {
    const hostname = parsedUrl.hostname;
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
      console.warn(`[FHIR Proxy] Blocked request to private IP: ${hostname} from ${ip}`);
      return NextResponse.json(
        { error: 'Access to private IP ranges not allowed in production' },
        { status: 403 }
      );
    }
  }

  // Check domain allowlist if configured
  if (ALLOWED_DOMAINS.length > 0) {
    const isAllowed = ALLOWED_DOMAINS.some(domain => {
      if (domain.startsWith('*.')) {
        // Wildcard subdomain matching
        const baseDomain = domain.slice(2);
        return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`);
      }
      return hostname === domain;
    });

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Domain not allowed' },
        { status: 403 }
      );
    }
  }

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/fhir+json',
    };

    // Parse custom headers if provided
    if (headersParam) {
      try {
        const customHeaders = JSON.parse(headersParam);
        Object.assign(headers, customHeaders);
      } catch (e) {
        return NextResponse.json({ error: 'Invalid headers JSON' }, { status: 400 });
      }
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check response size to prevent abuse
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
        return NextResponse.json(
          { error: 'Response too large' },
          { status: 413 }
        );
      }

      const data = await response.text();
    
      const duration = Date.now() - startTime;
      console.log(`[FHIR Proxy] Response ${response.status} for ${parsedUrl.hostname} (${duration}ms)`);
    
      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
