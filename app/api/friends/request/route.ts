// app/api/friends/request/route.ts - Enviar solicitud de amistad

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, friendRequests, friendships } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// POST /api/friends/request - Enviar solicitud de amistad
export async function POST(req: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const sender = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!sender) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const { receiverUsername } = await req.json();

        if (!receiverUsername) {
            return NextResponse.json({ error: "Falta el username del destinatario" }, { status: 400 });
        }

        // Obtener usuario destinatario
        const receiver = await db.query.users.findFirst({
            where: eq(users.username, receiverUsername),
        });

        if (!receiver) {
            return NextResponse.json({ error: "Usuario destinatario no encontrado" }, { status: 404 });
        }

        // No puedes enviarte solicitud a ti mismo
        if (sender.id === receiver.id) {
            return NextResponse.json({ error: "No puedes enviarte solicitud a ti mismo" }, { status: 400 });
        }

        // Verificar si ya son amigos
        const existingFriendship = await db.query.friendships.findFirst({
            where: or(
                and(
                    eq(friendships.userId1, sender.id),
                    eq(friendships.userId2, receiver.id)
                ),
                and(
                    eq(friendships.userId1, receiver.id),
                    eq(friendships.userId2, sender.id)
                )
            ),
        });

        if (existingFriendship) {
            return NextResponse.json({ error: "Ya son amigos" }, { status: 400 });
        }

        // Verificar si ya existe una solicitud pendiente
        const existingRequest = await db.query.friendRequests.findFirst({
            where: or(
                and(
                    eq(friendRequests.senderId, sender.id),
                    eq(friendRequests.receiverId, receiver.id),
                    eq(friendRequests.status, "pending")
                ),
                and(
                    eq(friendRequests.senderId, receiver.id),
                    eq(friendRequests.receiverId, sender.id),
                    eq(friendRequests.status, "pending")
                )
            ),
        });

        if (existingRequest) {
            return NextResponse.json({ error: "Ya existe una solicitud pendiente" }, { status: 400 });
        }

        // Crear solicitud de amistad
        const [request] = await db.insert(friendRequests).values({
            senderId: sender.id,
            receiverId: receiver.id,
            status: "pending",
        }).returning();

        // TODO: Crear notificación para el receptor
        // await createNotification(...)

        return NextResponse.json({
            success: true,
            request,
            message: "Solicitud de amistad enviada",
        });
    } catch (error) {
        console.error('Error sending friend request:', error);
        return NextResponse.json(
            { error: "Error al enviar solicitud de amistad" },
            { status: 500 }
        );
    }
}
