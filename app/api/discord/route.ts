import { NextRequest, NextResponse } from 'next/server';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export const config = {
    api: {
        bodyParser: false,
    },
};

async function handleDiscordRequest(request: NextRequest) {
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

        let body: any = null;
        if (request.method === 'POST') {
            const contentType = request.headers.get('Content-Type');
            if (contentType && contentType.includes('multipart/form-data')) {
                body = await request.formData();
            } else {
                body = await request.text();
                headers['Content-Type'] = 'application/json';
            }
        }

        console.log(`Sending ${request.method} request to Discord API:`, {
            url,
            method: request.method,
            headers: Object.keys(headers),
            bodyType: body instanceof FormData ? 'FormData' : typeof body
        });

        const response = await fetch(url, {
            method: request.method,
            headers,
            body: request.method !== 'GET' ? body : undefined
        });

        const responseData = await response.text();
        let parsedData;
        try {
            parsedData = JSON.parse(responseData);
        } catch {
            parsedData = responseData;
        }

        if (!response.ok) {
            console.error('Discord API error:', {
                status: response.status,
                statusText: response.statusText,
                data: parsedData,
                endpoint: endpoint,
                method: request.method
            });
            return NextResponse.json({
                error: 'Discord API error',
                details: parsedData
            }, { status: response.status });
        }

        return NextResponse.json(parsedData);
    } catch (error) {
        console.error('Error in Discord API request:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return handleDiscordRequest(request);
}

export async function POST(request: NextRequest) {
    return handleDiscordRequest(request);
}

export async function DELETE(request: NextRequest) {
    return handleDiscordRequest(request);
}