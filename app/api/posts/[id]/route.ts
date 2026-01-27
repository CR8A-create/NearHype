import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { communityPosts, users, communities, communityMembers, postVotes } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{ id: string }>;
};

// GET /api/posts/[id] - Ver post individual con toda su información
export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { id: postId } = await params;
        const { userId: clerkId } = await auth();

        const post = await db.query.communityPosts.findFirst({
            where: eq(communityPosts.id, postId),
            with: {
                author: {
                    columns: {
                        username: true,
                        avatarUrl: true,
                    },
                },
                community: {
                    columns: {
                        name: true,
                        slug: true,
                        iconUrl: true,
                    },
                },
            },
        });

        if (!post) {
            return NextResponse.json(
                { error: "Post no encontrado" },
                { status: 404 }
            );
        }

        // Obtener el voto del usuario actual si está autenticado
        let userVote = null;
        if (clerkId) {
            const user = await db.query.users.findFirst({
                where: eq(users.clerkId, clerkId),
            });

            if (user) {
                const vote = await db.query.postVotes.findFirst({
                    where: and(
                        eq(postVotes.postId, postId),
                        eq(postVotes.userId, user.id)
                    ),
                });
                userVote = vote?.voteType || null;
            }
        }

        return NextResponse.json({
            post,
            userVote,
        });
    } catch (error) {
        console.error("Error fetching post:", error);
        return NextResponse.json(
            { error: "Error al cargar el post" },
            { status: 500 }
        );
    }
}

// DELETE /api/posts/[id] - Eliminar post (autor, owner o moderador)
export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        const { id: postId } = await params;
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!user) {
            return NextResponse.json(
                { error: "Usuario no encontrado" },
                { status: 404 }
            );
        }

        const post = await db.query.communityPosts.findFirst({
            where: eq(communityPosts.id, postId),
        });

        if (!post) {
            return NextResponse.json(
                { error: "Post no encontrado" },
                { status: 404 }
            );
        }

        // Verificar que el usuario es el autor O moderador/owner de la comunidad
        let canDelete = post.userId === user.id;

        if (!canDelete) {
            // Verificar si es owner o moderador de la comunidad
            const membership = await db.query.communityMembers.findFirst({
                where: and(
                    eq(communityMembers.communityId, post.communityId),
                    eq(communityMembers.userId, user.id)
                ),
            });

            if (membership && (membership.role === 'owner' || membership.role === 'moderator')) {
                canDelete = true;
            }
        }

        if (!canDelete) {
            return NextResponse.json(
                { error: "No tienes permisos para eliminar este post" },
                { status: 403 }
            );
        }

        // Eliminar post (cascade eliminará votos y comentarios)
        await db.delete(communityPosts).where(eq(communityPosts.id, postId));

        // Decrementar contador de posts en la comunidad
        await db.update(communities)
            .set({ postCount: sql`${communities.postCount} - 1` })
            .where(eq(communities.id, post.communityId));

        return NextResponse.json({
            success: true,
            message: "Post eliminado",
        });
    } catch (error) {
        console.error("Error deleting post:", error);
        return NextResponse.json(
            { error: "Error al eliminar el post" },
            { status: 500 }
        );
    }
}

// PATCH /api/posts/[id] - Editar post (solo autor)
export async function PATCH(req: NextRequest, { params }: Params) {
    try {
        const { id: postId } = await params;
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!user) {
            return NextResponse.json(
                { error: "Usuario no encontrado" },
                { status: 404 }
            );
        }

        const post = await db.query.communityPosts.findFirst({
            where: eq(communityPosts.id, postId),
        });

        if (!post) {
            return NextResponse.json(
                { error: "Post no encontrado" },
                { status: 404 }
            );
        }

        // Solo el autor puede editar
        if (post.userId !== user.id) {
            return NextResponse.json(
                { error: "Solo el autor puede editar este post" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { title, content, mediaUrl, linkUrl } = body;

        if (!title || !title.trim()) {
            return NextResponse.json(
                { error: "El título es obligatorio" },
                { status: 400 }
            );
        }

        // Actualizar post
        await db.update(communityPosts)
            .set({
                title: title.trim(),
                content: content?.trim() || post.content,
                mediaUrl: mediaUrl !== undefined ? mediaUrl : post.mediaUrl,
                linkUrl: linkUrl !== undefined ? linkUrl : post.linkUrl,
                updatedAt: new Date(),
            })
            .where(eq(communityPosts.id, postId));

        return NextResponse.json({
            success: true,
            message: "Post actualizado",
        });
    } catch (error) {
        console.error("Error updating post:", error);
        return NextResponse.json(
            { error: "Error al actualizar el post" },
            { status: 500 }
        );
    }
}
