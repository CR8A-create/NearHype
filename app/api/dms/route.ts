// app/api/dms/route.ts - Lista de conversaciones DM

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, dmConversations, dmMessages } from "@/lib/db/schema";
import { eq, or, and, isNull, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/dms - Obtener lista de conversaciones
export async function GET() {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Obtener conversaciones donde el usuario participa
        const conversations = await db.query.dmConversations.findMany({
            where: or(
                eq(dmConversations.userId1, user.id),
                eq(dmConversations.userId2, user.id)
            ),
            orderBy: [desc(dmConversations.lastMessageAt)],
        });

        // Para cada conversación, obtener info del otro usuario y último mensaje
        const conversationsWithDetails = await Promise.all(
            conversations.map(async (conv) => {
                const otherUserId = conv.userId1 === user.id ? conv.userId2 : conv.userId1;

                const otherUser = await db.query.users.findFirst({
                    where: eq(users.id, otherUserId),
                    columns: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                });

                // Último mensaje
                const lastMessage = await db.query.dmMessages.findFirst({
                    where: and(
                        eq(dmMessages.conversationId, conv.id),
                        isNull(dmMessages.deletedAt)
                    ),
                    orderBy: [desc(dmMessages.createdAt)],
                });

                // Contar mensajes no leídos
                const unreadCount = await db.$count(
                    dmMessages,
                    and(
                        eq(dmMessages.conversationId, conv.id),
                        eq(dmMessages.isRead, false),
                        eq(dmMessages.senderId, otherUserId),
                        isNull(dmMessages.deletedAt)
                    )
                );

                return {
                    id: conv.id,
                    otherUser,
                    lastMessage: lastMessage ? {
                        content: lastMessage.content,
                        createdAt: lastMessage.createdAt,
                        senderId: lastMessage.senderId,
                    } : null,
                    unreadCount,
                    lastMessageAt: conv.lastMessageAt,
                };
            })
        );

        return NextResponse.json({ conversations: conversationsWithDetails });
    } catch (error) {
        console.error('Error fetching DM conversations:', error);
        return NextResponse.json(
            { error: "Error al cargar conversaciones" },
            { status: 500 }
        );
    }
}
// POST /api/dms - Crear o obtener conversación con un usuario
export async function POST(req: NextRequest) {
    try {
        const { userId: clerkId } = await auth();
        const { targetUsername } = await req.json();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        if (!targetUsername) {
            return NextResponse.json({ error: "Username requerido" }, { status: 400 });
        }

        // 1. Obtener usuario actual
        const currentUser = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!currentUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        // 2. Obtener usuario objetivo
        const targetUser = await db.query.users.findFirst({
            where: eq(users.username, targetUsername),
        });

        if (!targetUser) return NextResponse.json({ error: "Usuario destino no encontrado" }, { status: 404 });

        if (currentUser.id === targetUser.id) {
            return NextResponse.json({ error: "No puedes chatear contigo mismo" }, { status: 400 });
        }

        // 3. Buscar conversación existente (comprobar ambos órdenes)
        let conversation = await db.query.dmConversations.findFirst({
            where: or(
                and(eq(dmConversations.userId1, currentUser.id), eq(dmConversations.userId2, targetUser.id)),
                and(eq(dmConversations.userId1, targetUser.id), eq(dmConversations.userId2, currentUser.id))
            ),
        });

        // 4. Si no existe, crearla
        if (!conversation) {
            const [newConv] = await db.insert(dmConversations).values({
                userId1: currentUser.id, // Podríamos ordenar IDs aquí para consistencia
                userId2: targetUser.id,
                lastMessageAt: new Date(),
            }).returning();
            conversation = newConv;
        }

        // 5. Devolver formato consistente con GET
        return NextResponse.json({
            conversation: {
                id: conversation.id,
                otherUser: {
                    id: targetUser.id,
                    username: targetUser.username,
                    avatarUrl: targetUser.avatarUrl,
                },
                lastMessage: null, // Si es nueva, null. Si existía, se podría buscar, pero para abrir chat basta así.
                unreadCount: 0,
                lastMessageAt: conversation.lastMessageAt,
            }
        });

    } catch (error) {
        console.error('Error creating DM conversation:', error);
        return NextResponse.json(
            { error: "Error al crear conversación" },
            { status: 500 }
        );
    }
}
