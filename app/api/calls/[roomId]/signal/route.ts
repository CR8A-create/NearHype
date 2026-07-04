// POST /api/calls/[roomId]/signal - Enviar señal WebRTC
// GET /api/calls/[roomId]/signal - Recibir señales pendientes

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, callRooms, callSignals } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// POST - Enviar señal (SDP offer/answer o ICE candidate)
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
        const { signalType, signalData } = await req.json();

        const room = await db.query.callRooms.findFirst({
            where: eq(callRooms.id, roomId),
        });

        if (!room) return NextResponse.json({ error: "Sala no encontrada" }, { status: 404 });

        // Solo los participantes de la llamada pueden enviar señales; sin esta
        // comprobación cualquier usuario autenticado podría inyectar ofertas/ICE
        if (room.callerId !== currentUser.id && room.calleeId !== currentUser.id) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        // Determinar el destinatario
        const toUserId = room.callerId === currentUser.id ? room.calleeId : room.callerId;

        await db.insert(callSignals).values({
            roomId,
            fromUserId: currentUser.id,
            toUserId,
            signalType,
            signalData,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error sending signal:", error);
        return NextResponse.json({ error: "Error al enviar señal" }, { status: 500 });
    }
}

// GET - Recibir señales pendientes
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

        // Obtener señales no consumidas para este usuario
        const signals = await db
            .select()
            .from(callSignals)
            .where(and(
                eq(callSignals.roomId, roomId),
                eq(callSignals.toUserId, currentUser.id),
                eq(callSignals.consumed, false)
            ));

        // Marcar como consumidas en un solo UPDATE (esta ruta se pollea ~cada
        // 800ms durante una llamada: evitar una query por señal)
        if (signals.length > 0) {
            await db.update(callSignals)
                .set({ consumed: true })
                .where(inArray(callSignals.id, signals.map(s => s.id)));
        }

        return NextResponse.json({
            signals: signals.map(s => ({
                id: s.id,
                signalType: s.signalType,
                signalData: s.signalData,
                fromUserId: s.fromUserId,
            })),
        });
    } catch (error) {
        console.error("Error getting signals:", error);
        return NextResponse.json({ error: "Error al obtener señales" }, { status: 500 });
    }
}
