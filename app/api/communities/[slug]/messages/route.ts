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

        // Obtener últimos 50 mensajes con info del autor y replyTo
        const messagesResult = await db
            .select({
                id: communityMessages.id,
                content: communityMessages.content,
                mediaUrl: communityMessages.mediaUrl,
                linkUrl: communityMessages.linkUrl,
                replyToId: communityMessages.replyToId,
                createdAt: communityMessages.createdAt,
                deletedAt: communityMessages.deletedAt,
                userId: communityMessages.userId, // Para verificar permisos en frontend
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

        // Obtener datos de los mensajes a los que responden (si existen)
        const messageIds = messagesResult.map(m => m.id);
        const replyToIds = messagesResult
            .map(m => m.replyToId)
            .filter((id): id is string => id !== null);

        const replyToMessages = replyToIds.length > 0
            ? await db
                .select({
                    id: communityMessages.id,
                    content: communityMessages.content,
                    authorUsername: users.username,
                })
                .from(communityMessages)
                .leftJoin(users, eq(communityMessages.userId, users.id))
                .where(eq(communityMessages.communityId, community.id))
            : [];

        const replyToMap = new Map(replyToMessages.map(m => [m.id, m]));

        // Construir mensajes con replyTo populated
        const messages = messagesResult.map(msg => ({
            ...msg,
            replyTo: msg.replyToId && replyToMap.has(msg.replyToId)
                ? {
                    id: replyToMap.get(msg.replyToId)!.id,
                    content: replyToMap.get(msg.replyToId)!.content,
                    author: {
                        username: replyToMap.get(msg.replyToId)!.authorUsername,
                    },
                }
                : null,
        }));

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
        const { content, replyToId, imageUrl } = body;

        if (!content || !content.trim() || content.length > 1000) {
            return NextResponse.json(
                { error: "Mensaje inválido (máx 1000 caracteres)" },
                { status: 400 }
            );
        }

        // Extraer primer URL del contenido (si existe)
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = content.match(urlRegex);
        const linkUrl = urls ? urls[0] : null;

        // Crear mensaje
        const [newMessage] = await db
            .insert(communityMessages)
            .values({
                communityId: community.id,
                userId: user.id,
                content: content.trim(),
                replyToId: replyToId || null,
                mediaUrl: imageUrl || null,
                linkUrl: linkUrl,
            })
            .returning();

        // Si hay replyTo, obtener datos del mensaje original
        let replyToData = null;
        if (newMessage.replyToId) {
            const replyToMsg = await db
                .select({
                    id: communityMessages.id,
                    content: communityMessages.content,
                    authorUsername: users.username,
                })
                .from(communityMessages)
                .leftJoin(users, eq(communityMessages.userId, users.id))
                .where(eq(communityMessages.id, newMessage.replyToId))
                .limit(1);

            if (replyToMsg.length > 0) {
                replyToData = {
                    id: replyToMsg[0].id,
                    content: replyToMsg[0].content,
                    author: {
                        username: replyToMsg[0].authorUsername,
                    },
                };

                // Crear notificación para el autor del mensaje original
                const { createNotification } = await import('@/lib/notifications');

                // Obtener ID del autor del mensaje original
                const originalMessage = await db.query.communityMessages.findFirst({
                    where: eq(communityMessages.id, newMessage.replyToId),
                });

                if (originalMessage && originalMessage.userId !== user.id) {
                    // Solo notificar si no eres tú mismo
                    await createNotification({
                        userId: originalMessage.userId,
                        type: 'chat_reply',
                        title: `${user.username} respondió a tu mensaje`,
                        message: newMessage.content.substring(0, 100),
                        linkUrl: `/communities/${await params.then(p => p.slug)}`,
                        metadata: {
                            fromUserId: user.id,
                            fromUsername: user.username,
                            fromAvatarUrl: user.avatarUrl || undefined,
                            communitySlug: await params.then(p => p.slug),
                            messageId: newMessage.id,
                        },
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: {
                id: newMessage.id,
                content: newMessage.content,
                mediaUrl: newMessage.mediaUrl,
                linkUrl: newMessage.linkUrl,
                replyTo: replyToData,
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
