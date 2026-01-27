import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { communities, communityMembers, communityMessages, users } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{ slug: string }>;
};

// GET /api/communities/[slug]/messages - Obtener últimos 50 mensajes
export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { slug } = await params;
        const { userId: clerkId } = await auth();

        const community = await db.query.communities.findFirst({
            where: eq(communities.slug, slug),
        });

        if (!community) {
            return NextResponse.json(
                { error: "Comunidad no encontrada" },
                { status: 404 }
            );
        }

        // Obtener últimos 50 mensajes con info del autor
        const messages = await db
            .select({
                id: communityMessages.id,
                content: communityMessages.content,
                createdAt: communityMessages.createdAt,
                author: {
                    username: users.username,
                    avatarUrl: users.avatarUrl,
                },
            })
            .from(communityMessages)
            .leftJoin(users, eq(communityMessages.userId, users.id))
            .where(eq(communityMessages.communityId, community.id))
            .orderBy(desc(communityMessages.createdAt))
            .limit(50);

        // Revertir orden para mostrar más antiguos primero
        return NextResponse.json({
            messages: messages.reverse(),
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json(
            { error: "Error al cargar mensajes" },
            { status: 500 }
        );
    }
}

// POST /api/communities/[slug]/messages - Enviar mensaje (solo miembros)
export async function POST(req: NextRequest, { params }: Params) {
    try {
        const { slug } = await params;
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
                { error: "Debes ser miembro para enviar mensajes" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { content } = body;

        if (!content || !content.trim() || content.length > 1000) {
            return NextResponse.json(
                { error: "Mensaje inválido (máx 1000 caracteres)" },
                { status: 400 }
            );
        }

        // Crear mensaje
        const [newMessage] = await db
            .insert(communityMessages)
            .values({
                communityId: community.id,
                userId: user.id,
                content: content.trim(),
            })
            .returning();

        return NextResponse.json({
            success: true,
            message: {
                id: newMessage.id,
                content: newMessage.content,
                createdAt: newMessage.createdAt,
                author: {
                    username: user.username,
                    avatarUrl: user.avatarUrl,
                },
            },
        });
    } catch (error) {
        console.error("Error creating message:", error);
        return NextResponse.json(
            { error: "Error al enviar mensaje" },
            { status: 500 }
        );
    }
}
