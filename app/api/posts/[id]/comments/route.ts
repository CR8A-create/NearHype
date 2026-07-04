import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { communityPosts, postComments, users } from "@/lib/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { createCommentSchema, parseBody } from "@/lib/validation";

type Params = {
    params: Promise<{ id: string }>;
};

// GET /api/posts/[id]/comments - Listar comentarios de un post
export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { id: postId } = await params;

        const post = await db.query.communityPosts.findFirst({
            where: eq(communityPosts.id, postId),
        });

        if (!post) {
            return NextResponse.json(
                { error: "Post no encontrado" },
                { status: 404 }
            );
        }

        // Obtener comentarios de nivel superior (sin parent)
        const topLevelComments = await db.query.postComments.findMany({
            where: and(
                eq(postComments.postId, postId),
                isNull(postComments.parentCommentId)
            ),
            with: {
                author: {
                    columns: {
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: (comments, { desc }) => [desc(comments.upvotes), desc(comments.createdAt)],
        });

        // Para cada comentario, obtener sus replies (profundidad 1 nivel por ahora)
        const commentsWithReplies = await Promise.all(
            topLevelComments.map(async (comment) => {
                const replies = await db.query.postComments.findMany({
                    where: eq(postComments.parentCommentId, comment.id),
                    with: {
                        author: {
                            columns: {
                                username: true,
                                avatarUrl: true,
                            },
                        },
                    },
                    orderBy: (comments, { asc }) => [asc(comments.createdAt)],
                });

                return {
                    ...comment,
                    replies,
                };
            })
        );

        return NextResponse.json({
            comments: commentsWithReplies,
        });
    } catch (error) {
        console.error("Error fetching comments:", error);
        return NextResponse.json(
            { error: "Error al cargar comentarios" },
            { status: 500 }
        );
    }
}

// POST /api/posts/[id]/comments - Crear comentario
export async function POST(req: NextRequest, { params }: Params) {
    try {
        const { id: postId } = await params;
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const parsed = await parseBody(req, createCommentSchema);
        if (parsed.error) return parsed.error;
        const { content, parentCommentId, mediaUrl, linkUrl } = parsed.data;

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

        // Si es un reply, verificar que el comentario padre existe
        if (parentCommentId) {
            const parentComment = await db.query.postComments.findFirst({
                where: eq(postComments.id, parentCommentId),
            });

            if (!parentComment || parentComment.postId !== postId) {
                return NextResponse.json(
                    { error: "Comentario padre no válido" },
                    { status: 400 }
                );
            }
        }

        // Crear comentario
        const [newComment] = await db.insert(postComments).values({
            postId,
            userId: user.id,
            content,
            parentCommentId: parentCommentId || null,
            mediaUrl: mediaUrl || null,
            linkUrl: linkUrl || null,
        }).returning();

        // Incrementar contador de comentarios en el post
        await db.update(communityPosts)
            .set({ commentCount: sql`${communityPosts.commentCount} + 1` })
            .where(eq(communityPosts.id, postId));

        // Retornar comentario con info del autor
        const commentWithAuthor = await db.query.postComments.findFirst({
            where: eq(postComments.id, newComment.id),
            with: {
                author: {
                    columns: {
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            comment: commentWithAuthor,
        });
    } catch (error) {
        console.error("Error creating comment:", error);
        return NextResponse.json(
            { error: "Error al crear comentario" },
            { status: 500 }
        );
    }
}
