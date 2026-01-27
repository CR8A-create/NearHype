import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { communities, communityPosts, communityMembers, users } from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{ slug: string }>;
};

// GET /api/communities/[slug]/posts - Listar posts de una comunidad
export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { slug } = await params;
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        const community = await db.query.communities.findFirst({
            where: eq(communities.slug, slug),
        });

        if (!community) {
            return NextResponse.json(
                { error: "Comunidad no encontrada" },
                { status: 404 }
            );
        }

        // Obtener posts con información del autor
        const posts = await db.query.communityPosts.findMany({
            where: eq(communityPosts.communityId, community.id),
            with: {
                author: {
                    columns: {
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: [desc(communityPosts.isPinned), desc(communityPosts.upvotes), desc(communityPosts.createdAt)],
            limit,
            offset,
        });

        return NextResponse.json({
            posts,
            pagination: {
                page,
                limit,
                hasMore: posts.length === limit,
            },
        });
    } catch (error) {
        console.error("Error fetching posts:", error);
        return NextResponse.json(
            { error: "Error al cargar los posts" },
            { status: 500 }
        );
    }
}

// POST /api/communities/[slug]/posts - Crear nuevo post
export async function POST(req: NextRequest, { params }: Params) {
    try {
        const { slug } = await params;
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const body = await req.json();
        const { title, content, contentType, mediaUrl, linkUrl } = body;

        // Validaciones
        if (!title || title.length < 3) {
            return NextResponse.json(
                { error: "El título debe tener al menos 3 caracteres" },
                { status: 400 }
            );
        }

        if (contentType === 'link' && !linkUrl) {
            return NextResponse.json(
                { error: "Debes proporcionar una URL para posts de tipo link" },
                { status: 400 }
            );
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

        const community = await db.query.communities.findFirst({
            where: eq(communities.slug, slug),
        });

        if (!community) {
            return NextResponse.json(
                { error: "Comunidad no encontrada" },
                { status: 404 }
            );
        }

        // Verificar que el usuario es miembro
        const membership = await db.query.communityMembers.findFirst({
            where: and(
                eq(communityMembers.communityId, community.id),
                eq(communityMembers.userId, user.id)
            ),
        });

        if (!membership) {
            return NextResponse.json(
                { error: "Debes ser miembro para publicar en esta comunidad" },
                { status: 403 }
            );
        }

        // Crear post
        const [newPost] = await db.insert(communityPosts).values({
            communityId: community.id,
            userId: user.id,
            title,
            content: content || null,
            contentType: contentType || 'text',
            mediaUrl: mediaUrl || null,
            linkUrl: linkUrl || null,
        }).returning();

        // Incrementar contador de posts en la comunidad
        await db.update(communities)
            .set({ postCount: sql`${communities.postCount} + 1` })
            .where(eq(communities.id, community.id));

        return NextResponse.json({
            success: true,
            post: newPost,
        });
    } catch (error) {
        console.error("Error creating post:", error);
        return NextResponse.json(
            { error: "Error al crear el post" },
            { status: 500 }
        );
    }
}
