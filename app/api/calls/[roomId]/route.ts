// GET /api/calls/[roomId] - Info de la sala
// POST /api/calls/[roomId] - Acciones (join, reject, end)

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, callRooms, callSignals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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
        const { action } = await req.json();

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
                return NextResponse.json({ success: true, status: "rejected" });

            case "end":
                await db.update(callRooms)
                    .set({ status: "ended", endedAt: new Date() })
                    .where(eq(callRooms.id, roomId));
                // Limpiar señales
                await db.delete(callSignals).where(eq(callSignals.roomId, roomId));
                return NextResponse.json({ success: true, status: "ended" });

            default:
                return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
        }
    } catch (error) {
        console.error("Error updating call:", error);
        return NextResponse.json({ error: "Error al actualizar llamada" }, { status: 500 });
    }
}
