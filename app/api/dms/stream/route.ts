// app/api/dms/stream/route.ts — SSE for real-time DM messages
export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, dmConversations, dmMessages, friendships } from "@/lib/db/schema";
import { eq, and, or, gt, isNull, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
    // Auth MUST happen outside ReadableStream constructor (Clerk context)
    const { userId: clerkId } = await auth();
    if (!clerkId) {
        return new Response('Unauthorized', { status: 401 });
    }

    const currentUser = await db.query.users.findFirst({
        where: eq(users.clerkId, clerkId),
    });
    if (!currentUser) {
        return new Response('User not found', { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get('otherUserId');
    if (!otherUserId) {
        return new Response('otherUserId required', { status: 400 });
    }

    // Verify friendship before streaming
    const areFriends = await db.query.friendships.findFirst({
        where: or(
            and(eq(friendships.userId1, currentUser.id), eq(friendships.userId2, otherUserId)),
            and(eq(friendships.userId1, otherUserId), eq(friendships.userId2, currentUser.id))
        ),
    });
    if (!areFriends) {
        return new Response('Forbidden', { status: 403 });
    }

    // Resolve conversation ID (all DB work before stream)
    const userId1 = currentUser.id < otherUserId ? currentUser.id : otherUserId;
    const userId2 = currentUser.id < otherUserId ? otherUserId : currentUser.id;
    const conversation = await db.query.dmConversations.findFirst({
        where: and(eq(dmConversations.userId1, userId1), eq(dmConversations.userId2, userId2)),
    });
    if (!conversation) {
        return new Response('Conversation not found', { status: 404 });
    }

    // Determine starting timestamp:
    // 1. Last-Event-Id header (browser auto-reconnect with last received id)
    // 2. ?since= query param (manual reconnect from client)
    // 3. now (fresh connection)
    const lastEventId = req.headers.get('Last-Event-Id');
    const sinceParam = searchParams.get('since');
    let sinceDate: Date;
    if (lastEventId && !isNaN(Number(lastEventId))) {
        sinceDate = new Date(Number(lastEventId));
    } else if (sinceParam) {
        sinceDate = new Date(sinceParam);
    } else {
        sinceDate = new Date();
    }

    const convId = conversation.id;
    const encoder = new TextEncoder();
    const MAX_MS = 25_000;
    const POLL_MS = 2_000;

    const stream = new ReadableStream({
        async start(controller) {
            const startTime = Date.now();
            let since = sinceDate;
            let pollN = 0;

            const send = (data: string) => {
                try { controller.enqueue(encoder.encode(data)); } catch { /* client disconnected */ }
            };

            send('retry: 3000\n: connected\n\n');

            while (Date.now() - startTime < MAX_MS) {
                await new Promise<void>(r => setTimeout(r, POLL_MS));

                // Keepalive every 7 polls (14s)
                if (++pollN % 7 === 0) {
                    send(': keepalive\n\n');
                }

                try {
                    const newMsgs = await db.query.dmMessages.findMany({
                        where: and(
                            eq(dmMessages.conversationId, convId),
                            gt(dmMessages.createdAt, since),
                            isNull(dmMessages.deletedAt)
                        ),
                        orderBy: [asc(dmMessages.createdAt)],
                    });

                    if (newMsgs.length > 0) {
                        const lastMsg = newMsgs[newMsgs.length - 1];
                        if (lastMsg.createdAt) {
                            since = lastMsg.createdAt;
                            const eventId = lastMsg.createdAt.getTime();
                            send(`id: ${eventId}\ndata: ${JSON.stringify({ messages: newMsgs })}\n\n`);
                        }
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
