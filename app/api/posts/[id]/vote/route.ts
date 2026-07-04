import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { communityPosts, postVotes, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { voteSchema, parseBody } from "@/lib/validation";

type Params = {
    params: Promise<{ id: string }>;
};

// POST /api/posts/[id]/vote - Votar en un post (upvote/downvote)
export async function POST(req: NextRequest, { params }: Params) {
    try {
        const { id: postId } = await params;
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const parsed = await parseBody(req, voteSchema);
        if (parsed.error) return parsed.error;
        const { voteType } = parsed.data;

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

        // Verificar si ya votó
        const existingVote = await db.query.postVotes.findFirst({
            where: and(
                eq(postVotes.postId, postId),
                eq(postVotes.userId, user.id)
            ),
        });

        if (existingVote) {
            // Si el voto es el mismo, lo removemos (toggle)
            if (existingVote.voteType === voteType) {
                await db.delete(postVotes).where(eq(postVotes.id, existingVote.id));

                // Decrementar counter correspondiente
                if (voteType === 'upvote') {
                    await db.update(communityPosts)
                        .set({ upvotes: sql`${communityPosts.upvotes} - 1` })
                        .where(eq(communityPosts.id, postId));
                } else {
                    await db.update(communityPosts)
                        .set({ downvotes: sql`${communityPosts.downvotes} - 1` })
                        .where(eq(communityPosts.id, postId));
                }

                return NextResponse.json({
                    success: true,
                    action: 'removed',
                    voteType: null,
                });
            } else {
                // Cambiar el voto
                await db.update(postVotes)
                    .set({ voteType })
                    .where(eq(postVotes.id, existingVote.id));

                // Actualizar counters (decrementar el anterior, incrementar el nuevo)
                if (voteType === 'upvote') {
                    await db.update(communityPosts)
                        .set({
                            upvotes: sql`${communityPosts.upvotes} + 1`,
                            downvotes: sql`${communityPosts.downvotes} - 1`,
                        })
                        .where(eq(communityPosts.id, postId));
                } else {
                    await db.update(communityPosts)
                        .set({
                            upvotes: sql`${communityPosts.upvotes} - 1`,
                            downvotes: sql`${communityPosts.downvotes} + 1`,
                        })
                        .where(eq(communityPosts.id, postId));
                }

                return NextResponse.json({
                    success: true,
                    action: 'changed',
                    voteType,
                });
            }
        } else {
            // Crear nuevo voto
            await db.insert(postVotes).values({
                postId,
                userId: user.id,
                voteType,
            });

            // Incrementar counter correspondiente
            if (voteType === 'upvote') {
                await db.update(communityPosts)
                    .set({ upvotes: sql`${communityPosts.upvotes} + 1` })
                    .where(eq(communityPosts.id, postId));
            } else {
                await db.update(communityPosts)
                    .set({ downvotes: sql`${communityPosts.downvotes} + 1` })
                    .where(eq(communityPosts.id, postId));
            }

            return NextResponse.json({
                success: true,
                action: 'added',
                voteType,
            });
        }
    } catch (error) {
        console.error("Error voting on post:", error);
        return NextResponse.json(
            { error: "Error al votar" },
            { status: 500 }
        );
    }
}

// GET /api/posts/[id]/vote - Obtener el voto actual del usuario en un post
export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { id: postId } = await params;
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ voteType: null });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!user) {
            return NextResponse.json({ voteType: null });
        }

        const vote = await db.query.postVotes.findFirst({
            where: and(
                eq(postVotes.postId, postId),
                eq(postVotes.userId, user.id)
            ),
        });

        return NextResponse.json({
            voteType: vote?.voteType || null,
        });
    } catch (error) {
        console.error("Error fetching vote:", error);
        return NextResponse.json({ voteType: null });
    }
}
