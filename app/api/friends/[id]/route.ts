// app/api/friends/[id]/route.ts - Eliminar amigo

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, friendships, dmConversations } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

// DELETE /api/friends/[id] - Eliminar amigo
export async function DELETE(req: NextRequest, { params }: Params) {
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

        const { id: friendId } = await params;

        // Verificar que el amigo existe
        const friend = await db.query.users.findFirst({
            where: eq(users.id, friendId),
        });

        if (!friend) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Buscar y eliminar amistad
        const friendship = await db.query.friendships.findFirst({
            where: or(
                and(
                    eq(friendships.userId1, user.id),
                    eq(friendships.userId2, friendId)
                ),
                and(
                    eq(friendships.userId1, friendId),
                    eq(friendships.userId2, user.id)
                )
            ),
        });

        if (!friendship) {
            return NextResponse.json({ error: "No son amigos" }, { status: 400 });
        }

        await db
            .delete(friendships)
            .where(eq(friendships.id, friendship.id));

        // También eliminar la conversación DM entre ambos usuarios
        // (los mensajes se eliminan en cascada automáticamente)
        const sortedId1 = user.id < friendId ? user.id : friendId;
        const sortedId2 = user.id < friendId ? friendId : user.id;

        const conversation = await db.query.dmConversations.findFirst({
            where: and(
                eq(dmConversations.userId1, sortedId1),
                eq(dmConversations.userId2, sortedId2)
            ),
        });

        if (conversation) {
            await db
                .delete(dmConversations)
                .where(eq(dmConversations.id, conversation.id));
        }

        return NextResponse.json({
            success: true,
            message: "Amigo eliminado",
        });
    } catch (error) {
        console.error('Error removing friend:', error);
        return NextResponse.json(
            { error: "Error al eliminar amigo" },
            { status: 500 }
        );
    }
}
