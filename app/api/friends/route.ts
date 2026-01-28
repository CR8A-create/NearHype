// app/api/friends/route.ts - Listar amigos

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, friendships } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/friends - Obtener lista de amigos
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

        // Obtener amistades donde el usuario es userId1 o userId2
        const friendshipsData = await db.query.friendships.findMany({
            where: or(
                eq(friendships.userId1, user.id),
                eq(friendships.userId2, user.id)
            ),
            orderBy: (friendships, { desc }) => [desc(friendships.createdAt)],
        });

        // Obtener IDs de amigos
        const friendIds = friendshipsData.map(f =>
            f.userId1 === user.id ? f.userId2 : f.userId1
        );

        if (friendIds.length === 0) {
            return NextResponse.json({ friends: [] });
        }

        // Obtener info de amigos
        const friendsData = await db.query.users.findMany({
            where: or(...friendIds.map(id => eq(users.id, id))),
            columns: {
                id: true,
                username: true,
                avatarUrl: true,
                firstName: true,
                lastName: true,
                bio: true,
            },
        });

        // Combinar con fecha de amistad
        const friends = friendsData.map(friend => {
            const friendship = friendshipsData.find(f =>
                f.userId1 === friend.id || f.userId2 === friend.id
            );
            return {
                ...friend,
                friendsSince: friendship?.createdAt,
            };
        });

        return NextResponse.json({ friends });
    } catch (error) {
        console.error('Error fetching friends:', error);
        return NextResponse.json(
            { error: "Error al cargar amigos" },
            { status: 500 }
        );
    }
}
