import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { communityPosts, communities, users, userInterests } from "@/lib/db/schema";
import { eq, inArray, desc, sql } from "drizzle-orm";

/**
 * GET /api/discover
 * Feed personalizado basado en intereses del usuario
 * Algoritmo: relevancia * (1 + log(upvotes))
 */
export async function GET() {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Obtener usuario de la BD
        const [dbUser] = await db
            .select()
            .from(users)
            .where(eq(users.clerkId, user.id))
            .limit(1);

        if (!dbUser) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // Obtener intereses del usuario
        const interests = await db
            .select({ topic: userInterests.topic })
            .from(userInterests)
            .where(eq(userInterests.userId, dbUser.id));

        const userTopics = interests.map(i => i.topic.toLowerCase());

        // Si no tiene intereses, devolver posts más populares
        if (userTopics.length === 0) {
            const popularPosts = await db
                .select({
                    id: communityPosts.id,
                    title: communityPosts.title,
                    content: communityPosts.content,
                    upvotes: communityPosts.upvotes,
                    downvotes: communityPosts.downvotes,
                    commentCount: communityPosts.commentCount,
                    createdAt: communityPosts.createdAt,
                    communityName: communities.name,
                    communitySlug: communities.slug,
                    category: communities.category,
                    authorUsername: users.username,
                    authorAvatarUrl: users.avatarUrl,
                })
                .from(communityPosts)
                .innerJoin(communities, eq(communityPosts.communityId, communities.id))
                .innerJoin(users, eq(communityPosts.userId, users.id))
                .orderBy(desc(communityPosts.upvotes))
                .limit(50);

            const formattedPosts = popularPosts.map(post => ({
                ...post,
                author: {
                    username: post.authorUsername,
                    avatarUrl: post.authorAvatarUrl,
                },
            }));

            return NextResponse.json({ posts: formattedPosts });
        }

        // Obtener comunidades que coinciden con los intereses del usuario
        const relevantCommunities = await db
            .select({ id: communities.id })
            .from(communities)
            .where(
                // Parametrizado: los intereses son texto libre del usuario, nunca usar sql.raw
                sql`LOWER(${communities.category}) IN (${sql.join(userTopics.map(t => sql`${t}`), sql`, `)})`
            );

        const communityIds = relevantCommunities.map(c => c.id);

        let allPosts: {
            id: string;
            title: string;
            content: string | null;
            upvotes: number | null;
            downvotes: number | null;
            commentCount: number | null;
            createdAt: Date | null;
            communityName: string;
            communitySlug: string;
            category: string | null;
            authorUsername: string;
            authorAvatarUrl: string | null;
        }[] = [];

        if (communityIds.length > 0) {
            // Obtener posts de comunidades relevantes
            const relevantPosts = await db
                .select({
                    id: communityPosts.id,
                    title: communityPosts.title,
                    content: communityPosts.content,
                    upvotes: communityPosts.upvotes,
                    downvotes: communityPosts.downvotes,
                    commentCount: communityPosts.commentCount,
                    createdAt: communityPosts.createdAt,
                    communityName: communities.name,
                    communitySlug: communities.slug,
                    category: communities.category,
                    authorUsername: users.username,
                    authorAvatarUrl: users.avatarUrl,
                })
                .from(communityPosts)
                .innerJoin(communities, eq(communityPosts.communityId, communities.id))
                .innerJoin(users, eq(communityPosts.userId, users.id))
                .where(inArray(communityPosts.communityId, communityIds))
                .orderBy(desc(communityPosts.upvotes))
                .limit(40);

            allPosts = [...relevantPosts];
        }

        // Agregar algunos posts populares de otras categorías (10-20%)
        const otherPosts = await db
            .select({
                id: communityPosts.id,
                title: communityPosts.title,
                content: communityPosts.content,
                upvotes: communityPosts.upvotes,
                downvotes: communityPosts.downvotes,
                commentCount: communityPosts.commentCount,
                createdAt: communityPosts.createdAt,
                communityName: communities.name,
                communitySlug: communities.slug,
                category: communities.category,
                authorUsername: users.username,
                authorAvatarUrl: users.avatarUrl,
            })
            .from(communityPosts)
            .innerJoin(communities, eq(communityPosts.communityId, communities.id))
            .innerJoin(users, eq(communityPosts.userId, users.id))
            .orderBy(desc(communityPosts.upvotes))
            .limit(10);

        allPosts = [...allPosts, ...otherPosts];

        // Ordenar por algoritmo: upvotes con algo de randomización
        const scoredPosts = allPosts.map(post => {
            const upvotes = post.upvotes ?? 0;
            const score = upvotes * (1 + Math.log(1 + upvotes)) + Math.random() * 5;
            return { ...post, score };
        });

        scoredPosts.sort((a, b) => b.score - a.score);

        // Formatear respuesta
        const formattedPosts = scoredPosts.slice(0, 50).map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            upvotes: post.upvotes,
            downvotes: post.downvotes,
            commentCount: post.commentCount,
            createdAt: post.createdAt,
            communityName: post.communityName,
            communitySlug: post.communitySlug,
            category: post.category,
            author: {
                username: post.authorUsername,
                avatarUrl: post.authorAvatarUrl,
            },
        }));

        return NextResponse.json({ posts: formattedPosts });

    } catch (error) {
        console.error("Error fetching discover feed:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
