import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, notifications, friendRequests, dmMessages, dmConversations } from "@/lib/db/schema";
import { eq, and, isNull, or, count } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ unreadMessages: 0, pendingRequests: 0, unreadNotifications: 0 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
            columns: { id: true }
        });

        if (!user) return NextResponse.json({ unreadMessages: 0, pendingRequests: 0, unreadNotifications: 0 });

        // 1. Contar mensajes no leídos
        // Buscamos mensajes donde: receiverId is user OR conversation messages where user is participant and message is unread and from other user

        // La forma más precisa con el esquema actual es buscar conversaciones del usuario y luego contar mensajes no leídos en ellas enviados por el OTRO usuario.
        // Drizzle query compleja simplificada:

        // Buscamos todas las conversaciones del usuario
        const userConversations = await db.query.dmConversations.findMany({
            where: or(eq(dmConversations.userId1, user.id), eq(dmConversations.userId2, user.id)),
            columns: { id: true, userId1: true, userId2: true }
        });

        let unreadMessages = 0;

        // Para cada conversación, contamos los mensajes no leídos del OTRO usuario
        // Esto podría optimizarse con un raw SQL count, pero por ahora lo hacemos así para seguridad de tipos
        if (userConversations.length > 0) {
            for (const conv of userConversations) {
                const otherUserId = conv.userId1 === user.id ? conv.userId2 : conv.userId1;
                const count = await db.$count(
                    dmMessages,
                    and(
                        eq(dmMessages.conversationId, conv.id),
                        eq(dmMessages.isRead, false),
                        eq(dmMessages.senderId, otherUserId),
                        isNull(dmMessages.deletedAt)
                    )
                );
                unreadMessages += count;
            }
        }

        // 2. Contar solicitudes de amistad pendientes
        const pendingRequests = await db.$count(
            friendRequests,
            and(
                eq(friendRequests.receiverId, user.id),
                eq(friendRequests.status, "pending")
            )
        );

        // 3. Contar notificaciones generales no leídas
        const unreadNotifications = await db.$count(
            notifications,
            and(
                eq(notifications.userId, user.id),
                eq(notifications.isRead, false)
            )
        );

        return NextResponse.json({
            unreadMessages,
            pendingRequests,
            unreadNotifications
        });

    } catch (error) {
        console.error('Error fetching user status:', error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
