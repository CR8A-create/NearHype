// app/api/discover/profiles/[userId]/route.ts - Swipe action (like/skip)

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, profileSwipes, friendRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { swipeSchema, parseBody } from "@/lib/validation";

type Params = {
    params: Promise<{
        userId: string;
    }>;
};

// POST /api/discover/profiles/[userId] - Swipe action
export async function POST(req: NextRequest, { params }: Params) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const currentUser = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!currentUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const { userId: targetUserId } = await params;
        const parsed = await parseBody(req, swipeSchema);
        if (parsed.error) return parsed.error;
        const { action } = parsed.data;

        // Verificar que el usuario objetivo existe
        const targetUser = await db.query.users.findFirst({
            where: eq(users.id, targetUserId),
        });

        if (!targetUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Registrar swipe
        const existingSwipe = await db.query.profileSwipes.findFirst({
            where: and(
                eq(profileSwipes.userId, currentUser.id),
                eq(profileSwipes.targetUserId, targetUserId)
            ),
        });

        if (existingSwipe) {
            return NextResponse.json({ error: "Ya has evaluado este perfil" }, { status: 400 });
        }

        await db.insert(profileSwipes).values({
            userId: currentUser.id,
            targetUserId: targetUserId,
            action: action,
        });

        // Si es "like", enviar solicitud de amistad automáticamente
        if (action === 'like') {
            // Verificar que no haya solicitud pendiente
            const existingRequest = await db.query.friendRequests.findFirst({
                where: and(
                    eq(friendRequests.senderId, currentUser.id),
                    eq(friendRequests.receiverId, targetUserId),
                    eq(friendRequests.status, "pending")
                ),
            });

            if (!existingRequest) {
                await db.insert(friendRequests).values({
                    senderId: currentUser.id,
                    receiverId: targetUserId,
                    status: "pending",
                });
            }
        }

        return NextResponse.json({
            success: true,
            action,
            message: action === 'like' ? 'Solicitud de amistad enviada' : 'Perfil omitido',
        });
    } catch (error) {
        console.error('Error processing swipe:', error);
        return NextResponse.json(
            { error: "Error al procesar acción" },
            { status: 500 }
        );
    }
}
