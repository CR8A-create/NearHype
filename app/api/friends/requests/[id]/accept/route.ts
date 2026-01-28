// app/api/friends/requests/[id]/accept/route.ts - Aceptar solicitud de amistad

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, friendRequests, friendships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

// PUT /api/friends/requests/[id]/accept - Aceptar solicitud
export async function PUT(req: NextRequest, { params }: Params) {
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

        const { id: requestId } = await params;

        // Obtener solicitud
        const request = await db.query.friendRequests.findFirst({
            where: eq(friendRequests.id, requestId),
        });

        if (!request) {
            return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
        }

        // Verificar que eres el receptor
        if (request.receiverId !== user.id) {
            return NextResponse.json({ error: "No tienes permisos para aceptar esta solicitud" }, { status: 403 });
        }

        // Verificar que está pendiente
        if (request.status !== "pending") {
            return NextResponse.json({ error: "Esta solicitud ya fue procesada" }, { status: 400 });
        }

        // Actualizar solicitud a aceptada
        await db
            .update(friendRequests)
            .set({ status: "accepted" })
            .where(eq(friendRequests.id, requestId));

        // Crear amistad (siempre userId1 < userId2 para evitar duplicados)
        const userId1 = request.senderId < request.receiverId ? request.senderId : request.receiverId;
        const userId2 = request.senderId < request.receiverId ? request.receiverId : request.senderId;

        await db.insert(friendships).values({
            userId1,
            userId2,
        });

        // TODO: Crear notificación para el sender
        // await createNotification(...)

        return NextResponse.json({
            success: true,
            message: "Solicitud aceptada",
        });
    } catch (error) {
        console.error('Error accepting friend request:', error);
        return NextResponse.json(
            { error: "Error al aceptar solicitud" },
            { status: 500 }
        );
    }
}
