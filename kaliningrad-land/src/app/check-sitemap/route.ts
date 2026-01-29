import { NextResponse } from 'next/server';
import { SSR_API_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
    const results = {
        ssr_url: SSR_API_URL,
        listings_url: `${SSR_API_URL}/api/listings/slugs/all`,
        status: 'pending',
        error: null as any,
        data: null as any,
    };

    try {
        console.log(`[DEBUG] Fetching listings from: ${results.listings_url}`);

        const res = await fetch(results.listings_url, {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        results.status = res.status.toString();

        if (!res.ok) {
            const text = await res.text();
            results.error = `HTTP Error: ${res.status} ${res.statusText}. Body: ${text}`;
        } else {
            const data = await res.json();
            results.data = data;
        }

    } catch (error: any) {
        console.error('[DEBUG] Fetch error:', error);
        results.error = {
            message: error.message,
            cause: error.cause,
            code: error.code,
            stack: error.stack,
        };
    }

    return NextResponse.json(results, { status: 200 });
}
