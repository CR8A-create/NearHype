// app/api/user/status/route.ts - Estado del usuario (mensajes no leidos, solicitudes pendientes)

import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { db } from "@/lib/db";
import { dmConversations, dmMessages, friendRequests } from "@/lib/db/schema";
import { eq, or, and, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/user/status - Obtener contadores de notificaciones
export async function GET() {
    try {
        const user = await getOrCreateUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Contar mensajes DM no leídos (donde soy receptor)
        // Primero obtener todas mis conversaciones
        const myConversations = await db.query.dmConversations.findMany({
            where: or(
                eq(dmConversations.userId1, user.id),
                eq(dmConversations.userId2, user.id)
            ),
        });

        let unreadMessages = 0;
        for (const conv of myConversations) {
            const count = await db.$count(
                dmMessages,
                and(
                    eq(dmMessages.conversationId, conv.id),
                    eq(dmMessages.isRead, false),
                    ne(dmMessages.senderId, user.id) // Mensajes que NO envié yo
                )
            );
            unreadMessages += count;
        }

        // Contar solicitudes de amistad pendientes (donde soy receptor)
        const pendingRequests = await db.$count(
            friendRequests,
            and(
                eq(friendRequests.receiverId, user.id),
                eq(friendRequests.status, "pending")
            )
        );

        return NextResponse.json({
            unreadMessages,
            pendingRequests,
        });
    } catch (error) {
        console.error('Error fetching user status:', error);
        return NextResponse.json(
            { error: "Error al obtener estado" },
            { status: 500 }
        );
    }
}
