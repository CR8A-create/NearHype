// GET /api/calls/[roomId] - Info de la sala
// POST /api/calls/[roomId] - Acciones (join, reject, end)

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, callRooms, callSignals, dmConversations, dmMessages } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Helper: registrar evento de llamada en el chat DM
async function registerCallMessage(callerId: string, calleeId: string, callType: string, status: string, duration?: number) {
    try {
        // Buscar o crear conversación DM entre los dos usuarios
        const existingConv = await db.query.dmConversations.findFirst({
            where: or(
                and(eq(dmConversations.userId1, callerId), eq(dmConversations.userId2, calleeId)),
                and(eq(dmConversations.userId1, calleeId), eq(dmConversations.userId2, callerId))
            ),
        });

        let conversationId: string;

        if (existingConv) {
            conversationId = existingConv.id;
        } else {
            const [newConv] = await db.insert(dmConversations).values({
                userId1: callerId,
                userId2: calleeId,
            }).returning();
            conversationId = newConv.id;
        }

        // Determinar el contenido del mensaje según el estado
        const typeLabel = callType === "video" ? "📹 Videollamada" : "📞 Llamada de voz";
        let content: string;

        switch (status) {
            case "ended": {
                const durationText = duration && duration > 0
                    ? ` — ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}`
                    : "";
                content = `${typeLabel} finalizada${durationText}`;
                break;
            }
            case "rejected":
                content = `${typeLabel} rechazada`;
                break;
            case "missed":
                content = `${typeLabel} perdida`;
                break;
            default:
                content = `${typeLabel}`;
        }

        // Insertar mensaje de sistema
        await db.insert(dmMessages).values({
            conversationId,
            senderId: callerId,
            content: `[CALL] ${content}`,
        });

        // Actualizar lastMessageAt
        await db.update(dmConversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(dmConversations.id, conversationId));

    } catch (error) {
        console.error("Error registering call message:", error);
        // No propagar el error - esto es best-effort
    }
}

// GET - Obtener info de la sala
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

        const currentUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
        if (!currentUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        const { roomId } = await params;

        const room = await db.query.callRooms.findFirst({
            where: eq(callRooms.id, roomId),
        });

        if (!room) return NextResponse.json({ error: "Sala no encontrada" }, { status: 404 });

        // Verificar que el usuario es parte de esta llamada
        if (room.callerId !== currentUser.id && room.calleeId !== currentUser.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        // Obtener info del otro usuario
        const otherUserId = room.callerId === currentUser.id ? room.calleeId : room.callerId;
        const otherUser = await db.query.users.findFirst({
            where: eq(users.id, otherUserId),
        });

        return NextResponse.json({
            room: {
                id: room.id,
                callerId: room.callerId,
                calleeId: room.calleeId,
                callType: room.callType,
                status: room.status,
                startedAt: room.startedAt,
                createdAt: room.createdAt,
            },
            otherUser: otherUser ? {
                id: otherUser.id,
                username: otherUser.username,
                avatarUrl: otherUser.avatarUrl,
            } : null,
            currentUserId: currentUser.id,
            isCaller: room.callerId === currentUser.id,
        });
    } catch (error) {
        console.error("Error getting call room:", error);
        return NextResponse.json({ error: "Error al obtener sala" }, { status: 500 });
    }
}

// POST - Acciones sobre la sala (join, reject, end)
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

        const currentUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
        if (!currentUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        const { roomId } = await params;
        const { action, callDuration } = await req.json();

        const room = await db.query.callRooms.findFirst({
            where: eq(callRooms.id, roomId),
        });

        if (!room) return NextResponse.json({ error: "Sala no encontrada" }, { status: 404 });

        if (room.callerId !== currentUser.id && room.calleeId !== currentUser.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        switch (action) {
            case "join":
                await db.update(callRooms)
                    .set({ status: "active", startedAt: new Date() })
                    .where(eq(callRooms.id, roomId));
                return NextResponse.json({ success: true, status: "active" });

            case "reject":
                await db.update(callRooms)
                    .set({ status: "rejected", endedAt: new Date() })
                    .where(eq(callRooms.id, roomId));
                // Registrar en el chat
                await registerCallMessage(room.callerId, room.calleeId, room.callType, "rejected");
                return NextResponse.json({ success: true, status: "rejected" });

            case "end":
                await db.update(callRooms)
                    .set({ status: "ended", endedAt: new Date() })
                    .where(eq(callRooms.id, roomId));
                // Limpiar señales
                await db.delete(callSignals).where(eq(callSignals.roomId, roomId));
                // Registrar en el chat con duración
                await registerCallMessage(room.callerId, room.calleeId, room.callType, "ended", callDuration);
                return NextResponse.json({ success: true, status: "ended" });

            default:
                return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
        }
    } catch (error) {
        console.error("Error updating call:", error);
        return NextResponse.json({ error: "Error al actualizar llamada" }, { status: 500 });
    }
}
