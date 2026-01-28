// app/api/friends/requests/route.ts - Ver solicitudes de amistad pendientes

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, friendRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/friends/requests - Ver solicitudes pendientes recibidas
export async function GET(req: NextRequest) {
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

        // Obtener solicitudes pendientes recibidas
        const requests = await db.query.friendRequests.findMany({
            where: and(
                eq(friendRequests.receiverId, user.id),
                eq(friendRequests.status, "pending")
            ),
            with: {
                sender: {
                    columns: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: (friendRequests, { desc }) => [desc(friendRequests.createdAt)],
        });

        return NextResponse.json({
            requests: requests.map(req => ({
                id: req.id,
                sender: req.sender,
                createdAt: req.createdAt,
            })),
        });
    } catch (error) {
        console.error('Error fetching friend requests:', error);
        return NextResponse.json(
            { error: "Error al cargar solicitudes" },
            { status: 500 }
        );
    }
}
