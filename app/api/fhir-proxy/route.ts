import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get('url');
  const headersParam = searchParams.get('headers');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
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

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
