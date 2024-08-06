import { NextRequest, NextResponse } from 'next/server';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

async function handleDiscordRequest(request: NextRequest, method: 'GET' | 'POST') {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const botToken = request.headers.get('X-Discord-Bot-Token');

  if (!botToken) {
    return NextResponse.json({ error: 'Discord bot token not provided' }, { status: 400 });
  }

  try {
    if (endpoint === '/fetchFile') {
      const fileUrl = searchParams.get('url');
      if (!fileUrl) {
        return NextResponse.json({ error: 'File URL not provided' }, { status: 400 });
      }

      // Fetch the file from Discord's CDN
      const response = await fetch(fileUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching file from CDN:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        return NextResponse.json({ 
          error: 'Error fetching file from CDN', 
          status: response.status,
          statusText: response.statusText,
          errorText
        }, { status: response.status });
      }

      const data = await response.arrayBuffer();
      return new Response(data, {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
    }

    const url = `${DISCORD_API_BASE}${endpoint}`;
    const headers: HeadersInit = {
      'Authorization': `Bot ${botToken}`,
    };

    let body: BodyInit | null = null;
    if (method === 'POST') {
      const contentType = request.headers.get('Content-Type');
      if (contentType && contentType.includes('multipart/form-data')) {
        body = await request.formData();
      } else {
        body = await request.text();
        headers['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(url, { method, headers, body });
    const data = await response.json();

    if (!response.ok) {
      console.error('Discord API error:', {
        status: response.status,
        statusText: response.statusText,
        data
      });
      return NextResponse.json({ 
        error: 'Discord API error', 
        details: data 
      }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Discord API error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleDiscordRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleDiscordRequest(request, 'POST');
}