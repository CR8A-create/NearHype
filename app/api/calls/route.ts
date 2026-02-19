// POST /api/calls - Crear una llamada (llamar a alguien)
// GET /api/calls - Obtener incoming calls

import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { db } from "@/lib/db";
import { users, callRooms, friendships } from "@/lib/db/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// POST - Crear una llamada nueva
export async function POST(req: NextRequest) {
    try {
        const currentUser = await getOrCreateUser();
        if (!currentUser) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

        const { calleeId, callType = "video" } = await req.json();

        if (!calleeId) return NextResponse.json({ error: "calleeId requerido" }, { status: 400 });

        // Verificar que son amigos
        const friendship = await db.query.friendships.findFirst({
            where: or(
                and(eq(friendships.userId1, currentUser.id), eq(friendships.userId2, calleeId)),
                and(eq(friendships.userId1, calleeId), eq(friendships.userId2, currentUser.id))
            ),
        });

        if (!friendship) {
            return NextResponse.json({ error: "Solo puedes llamar a amigos" }, { status: 403 });
        }

        // Cancelar llamadas activas previas del caller
        await db.update(callRooms)
            .set({ status: "ended", endedAt: new Date() })
            .where(and(
                eq(callRooms.callerId, currentUser.id),
                or(eq(callRooms.status, "ringing"), eq(callRooms.status, "active"))
            ));

        // Crear la sala de llamada
        const [room] = await db.insert(callRooms).values({
            callerId: currentUser.id,
            calleeId,
            callType,
            status: "ringing",
        }).returning();

        return NextResponse.json({
            success: true,
            room: {
                id: room.id,
                callerId: room.callerId,
                calleeId: room.calleeId,
                callType: room.callType,
                status: room.status,
            },
        });
    } catch (error) {
        console.error("Error creating call:", error);
        return NextResponse.json({ error: "Error al crear llamada" }, { status: 500 });
    }
}

// GET - Obtener llamadas entrantes
export async function GET() {
    try {
        const currentUser = await getOrCreateUser();
        if (!currentUser) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

        // Buscar llamadas entrantes "ringing" para este usuario
        const incomingCalls = await db
            .select({
                id: callRooms.id,
                callerId: callRooms.callerId,
                calleeId: callRooms.calleeId,
                callType: callRooms.callType,
                status: callRooms.status,
                createdAt: callRooms.createdAt,
                callerUsername: users.username,
                callerAvatar: users.avatarUrl,
            })
            .from(callRooms)
            .innerJoin(users, eq(callRooms.callerId, users.id))
            .where(and(
                eq(callRooms.calleeId, currentUser.id),
                eq(callRooms.status, "ringing")
            ))
            .orderBy(desc(callRooms.createdAt))
            .limit(1);

        // Auto-timeout: marcar como missed si tiene más de 30 segundos
        for (const call of incomingCalls) {
            if (call.createdAt && Date.now() - new Date(call.createdAt).getTime() > 30000) {
                await db.update(callRooms)
                    .set({ status: "missed", endedAt: new Date() })
                    .where(eq(callRooms.id, call.id));
            }
        }

        const activeCalls = incomingCalls.filter(c => {
            if (!c.createdAt) return true;
            return Date.now() - new Date(c.createdAt).getTime() <= 30000;
        });

        return NextResponse.json({ incomingCall: activeCalls[0] || null });
    } catch (error) {
        console.error("Error fetching calls:", error);
        return NextResponse.json({ error: "Error al obtener llamadas" }, { status: 500 });
    }
}
