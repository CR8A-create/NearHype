// app/api/notifications/stream/route.ts — SSE for real-time notification count
export const dynamic = 'force-dynamic';


import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
    // Auth MUST happen outside ReadableStream constructor (Clerk context)
    const user = await getOrCreateUser();
    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const encoder = new TextEncoder();
    const MAX_MS = 25_000;
    const POLL_MS = 3_000;

    const stream = new ReadableStream({
        async start(controller) {
            const startTime = Date.now();
            let lastCount = -1;
            let lastNewestId: string | null = null;
            let pollN = 0;

            const send = (data: string) => {
                try { controller.enqueue(encoder.encode(data)); } catch { /* client disconnected */ }
            };

            // Tell client to reconnect after 3s if stream ends
            send('retry: 3000\n: connected\n\n');

            while (Date.now() - startTime < MAX_MS) {
                await new Promise<void>(r => setTimeout(r, POLL_MS));

                // Keepalive every 5 polls (15s) to prevent proxy timeouts
                if (++pollN % 5 === 0) {
                    send(': keepalive\n\n');
                }

                try {
                    const unread = await db.query.notifications.findMany({
                        where: and(
                            eq(notifications.userId, user.id),
                            eq(notifications.isRead, false)
                        ),
                        columns: { id: true, createdAt: true },
                        orderBy: [desc(notifications.createdAt)],
                        limit: 100,
                    });

                    const count = unread.length;
                    const newestId = unread[0]?.id ?? null;

                    if (count !== lastCount || newestId !== lastNewestId) {
                        lastCount = count;
                        lastNewestId = newestId;
                        send(`id: ${Date.now()}\ndata: ${JSON.stringify({ count, newestId })}\n\n`);
                    }
                } catch {
                    // Silently continue — transient DB errors shouldn't kill the stream
                }
            }

            try { controller.close(); } catch { /* already closed */ }
        },
        cancel() { /* client disconnected early */ },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
        },
    });
}
