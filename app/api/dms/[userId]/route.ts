// app/api/dms/[userId]/route.ts - Mensajes con usuario específico

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, dmConversations, dmMessages, friendships } from "@/lib/db/schema";
import { eq, or, and, isNull, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{
        userId: string;
    }>;
};

// GET /api/dms/[userId] - Obtener o crear conversación y sus mensajes
export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const currentUser = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!currentUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const { userId: otherUserId } = await params;

        // Verificar que el otro usuario existe
        const otherUser = await db.query.users.findFirst({
            where: eq(users.id, otherUserId),
        });

        if (!otherUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Verificar que son amigos
        const areFriends = await db.query.friendships.findFirst({
            where: or(
                and(
                    eq(friendships.userId1, currentUser.id),
                    eq(friendships.userId2, otherUserId)
                ),
                and(
                    eq(friendships.userId1, otherUserId),
                    eq(friendships.userId2, currentUser.id)
                )
            ),
        });

        if (!areFriends) {
            return NextResponse.json({ error: "Solo puedes enviar mensajes a tus amigos" }, { status: 403 });
        }

        // Buscar o crear conversación (siempre userId1 < userId2)
        const userId1 = currentUser.id < otherUserId ? currentUser.id : otherUserId;
        const userId2 = currentUser.id < otherUserId ? otherUserId : currentUser.id;

        let conversation = await db.query.dmConversations.findFirst({
            where: and(
                eq(dmConversations.userId1, userId1),
                eq(dmConversations.userId2, userId2)
            ),
        });

        if (!conversation) {
            // Crear nueva conversación
            const [newConv] = await db.insert(dmConversations).values({
                userId1,
                userId2,
            }).returning();
            conversation = newConv;
        }

        // Obtener mensajes
        const messages = await db.query.dmMessages.findMany({
            where: and(
                eq(dmMessages.conversationId, conversation.id),
                isNull(dmMessages.deletedAt)
            ),
            orderBy: [desc(dmMessages.createdAt)],
            limit: 100,
        });

        // Marcar mensajes del otro usuario como leídos
        await db
            .update(dmMessages)
            .set({ isRead: true })
            .where(
                and(
                    eq(dmMessages.conversationId, conversation.id),
                    eq(dmMessages.senderId, otherUserId),
                    eq(dmMessages.isRead, false)
                )
            );

        return NextResponse.json({
            conversation: {
                id: conversation.id,
                otherUser: {
                    id: otherUser.id,
                    username: otherUser.username,
                    avatarUrl: otherUser.avatarUrl,
                },
            },
            messages: messages.reverse(), // Ordenar del más antiguo al más reciente
        });
    } catch (error) {
        console.error('Error fetching DM messages:', error);
        return NextResponse.json(
            { error: "Error al cargar mensajes" },
            { status: 500 }
        );
    }
}

// POST /api/dms/[userId] - Enviar mensaje
export async function POST(req: NextRequest, { params }: Params) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const currentUser = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!currentUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const { userId: otherUserId } = await params;
        const { content, mediaUrl } = await req.json();

        if (!content?.trim()) {
            return NextResponse.json({ error: "El mensaje no puede estar vacío" }, { status: 400 });
        }

        // Verificar que son amigos
        const areFriends = await db.query.friendships.findFirst({
            where: or(
                and(
                    eq(friendships.userId1, currentUser.id),
                    eq(friendships.userId2, otherUserId)
                ),
                and(
                    eq(friendships.userId1, otherUserId),
                    eq(friendships.userId2, currentUser.id)
                )
            ),
        });

        if (!areFriends) {
            return NextResponse.json({ error: "Solo puedes enviar mensajes a tus amigos" }, { status: 403 });
        }

        // Buscar o crear conversación
        const userId1 = currentUser.id < otherUserId ? currentUser.id : otherUserId;
        const userId2 = currentUser.id < otherUserId ? otherUserId : currentUser.id;

        let conversation = await db.query.dmConversations.findFirst({
            where: and(
                eq(dmConversations.userId1, userId1),
                eq(dmConversations.userId2, userId2)
            ),
        });

        if (!conversation) {
            const [newConv] = await db.insert(dmConversations).values({
                userId1,
                userId2,
            }).returning();
            conversation = newConv;
        }

        // Crear mensaje
        const [message] = await db.insert(dmMessages).values({
            conversationId: conversation.id,
            senderId: currentUser.id,
            content: content.trim(),
            mediaUrl: mediaUrl || null,
        }).returning();

        // Actualizar lastMessageAt de la conversación
        await db
            .update(dmConversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(dmConversations.id, conversation.id));

        // TODO: Crear notificación para el receptor
        // await createNotification(...)

        return NextResponse.json({
            success: true,
            message,
        });
    } catch (error) {
        console.error('Error sending DM:', error);
        return NextResponse.json(
            { error: "Error al enviar mensaje" },
            { status: 500 }
        );
    }
}
