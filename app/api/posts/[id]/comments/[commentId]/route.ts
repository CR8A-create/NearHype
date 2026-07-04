// app/api/posts/[id]/comments/[commentId]/route.ts - DELETE comentario

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, communityPosts, postComments, communityMembers, communities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{
        id: string;
        commentId: string;
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

        const { id: postId, commentId } = await params;

        // Obtener comentario
        const comment = await db.query.postComments.findFirst({
            where: eq(postComments.id, commentId),
        });

        // El comentario debe pertenecer al post de la URL; si no, un moderador
        // podría borrar comentarios de otras comunidades usando su propio postId
        if (!comment || comment.postId !== postId) {
            return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 });
        }

        // Obtener post
        const post = await db.query.communityPosts.findFirst({
            where: eq(communityPosts.id, postId),
        });

        if (!post) {
            return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
        }

        // Obtener comunidad
        const community = await db.query.communities.findFirst({
            where: eq(communities.id, post.communityId),
        });

        if (!community) {
            return NextResponse.json({ error: "Comunidad no encontrada" }, { status: 404 });
        }

        // Verificar membresía y permisos
        const membership = await db.query.communityMembers.findFirst({
            where: and(
                eq(communityMembers.communityId, community.id),
                eq(communityMembers.userId, user.id)
            ),
        });

        if (!membership) {
            return NextResponse.json({ error: "No eres miembro de esta comunidad" }, { status: 403 });
        }

        // Permisos: propietario del comentario, mod, admin, o owner de la comunidad
        const canDelete =
            comment.userId === user.id ||
            membership.role === 'moderator' ||
            membership.role === 'admin' ||
            community.createdBy === user.id;

        if (!canDelete) {
            return NextResponse.json({ error: "No tienes permisos para eliminar este comentario" }, { status: 403 });
        }

        // Soft delete: marcar como eliminado
        await db
            .update(postComments)
            .set({
                deletedAt: new Date(),
                deletedBy: user.id,
            })
            .where(eq(postComments.id, commentId));

        // Decrementar contador de comentarios en el post
        const { sql } = await import('drizzle-orm');
        await db
            .update(communityPosts)
            .set({ commentCount: sql`GREATEST(${communityPosts.commentCount} - 1, 0)` })
            .where(eq(communityPosts.id, postId));

        return NextResponse.json({
            success: true,
            message: "Comentario eliminado correctamente",
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        return NextResponse.json(
            { error: "Error al eliminar comentario" },
            { status: 500 }
        );
    }
}
