// app/api/communities/[slug]/messages/[id]/route.ts - DELETE mensaje

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, communities, communityMembers, communityMessages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{
        slug: string;
        id: string;
    }>;
};

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

        const { slug, id: messageId } = await params;

        // Obtener comunidad
        const community = await db.query.communities.findFirst({
            where: eq(communities.slug, slug),
        });

        if (!community) {
            return NextResponse.json({ error: "Comunidad no encontrada" }, { status: 404 });
        }

        // Obtener mensaje
        const message = await db.query.communityMessages.findFirst({
            where: eq(communityMessages.id, messageId),
        });

        if (!message) {
            return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
        }

        // Verificar permisos
        const membership = await db.query.communityMembers.findFirst({
            where: and(
                eq(communityMembers.communityId, community.id),
                eq(communityMembers.userId, user.id)
            ),
        });

        if (!membership) {
            return NextResponse.json({ error: "No eres miembro de esta comunidad" }, { status: 403 });
        }

        // Permisos: propietario del mensaje, mod, admin, o owner de la comunidad
        const canDelete =
            message.userId === user.id ||
            membership.role === 'moderator' ||
            membership.role === 'admin' ||
            community.createdBy === user.id;

        if (!canDelete) {
            return NextResponse.json({ error: "No tienes permisos para eliminar este mensaje" }, { status: 403 });
        }

        // Soft delete: marcar como eliminado
        await db
            .update(communityMessages)
            .set({
                deletedAt: new Date(),
                deletedBy: user.id,
            })
            .where(eq(communityMessages.id, messageId));

        return NextResponse.json({
            success: true,
            message: "Mensaje eliminado correctamente",
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json(
            { error: "Error al eliminar mensaje" },
            { status: 500 }
        );
    }
}
