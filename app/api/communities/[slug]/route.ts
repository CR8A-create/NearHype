import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { communities, communityMembers, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { updateCommunitySchema, parseBody } from "@/lib/validation";

type Params = {
    params: Promise<{ slug: string }>;
};

// GET /api/communities/[slug] - Ver comunidad específica
export async function GET(req: NextRequest, { params }: Params) {
    try {
        const { slug } = await params;
        const { userId: clerkId } = await auth();

        const community = await db.query.communities.findFirst({
            where: eq(communities.slug, slug),
            with: {
                creator: {
                    columns: {
                        username: true,
                        avatarUrl: true,
                    },
                },
                members: {
                    limit: 10,
                    with: {
                        user: {
                            columns: {
                                username: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
        });

        if (!community) {
            return NextResponse.json(
                { error: "Comunidad no encontrada" },
                { status: 404 }
            );
        }

        // Verificar si el usuario actual es miembro
        let isMember = false;
        let userRole = null;

        if (clerkId) {
            const user = await db.query.users.findFirst({
                where: eq(users.clerkId, clerkId),
            });

            if (user) {
                const membership = await db.query.communityMembers.findFirst({
                    where: and(
                        eq(communityMembers.communityId, community.id),
                        eq(communityMembers.userId, user.id)
                    ),
                });

                if (membership) {
                    isMember = true;
                    userRole = membership.role;
                }
            }
        }

        return NextResponse.json({
            community,
            isMember,
            userRole,
        });
    } catch (error) {
        console.error("Error fetching community:", error);
        return NextResponse.json(
            { error: "Error al cargar la comunidad" },
            { status: 500 }
        );
    }
}

// DELETE /api/communities/[slug] - Eliminar comunidad (solo owner)
export async function DELETE(req: NextRequest, { params }: Params) {
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

        // Verificar que el usuario es el owner
        const membership = await db.query.communityMembers.findFirst({
            where: and(
                eq(communityMembers.communityId, community.id),
                eq(communityMembers.userId, user.id)
            ),
        });

        if (!membership || membership.role !== "owner") {
            return NextResponse.json(
                { error: "Solo el propietario puede eliminar la comunidad" },
                { status: 403 }
            );
        }

        // Eliminar comunidad (cascade eliminará posts, miembros, etc.)
        await db.delete(communities).where(eq(communities.id, community.id));

        return NextResponse.json({
            success: true,
            message: "Comunidad eliminada",
        });
    } catch (error) {
        console.error("Error deleting community:", error);
        return NextResponse.json(
            { error: "Error al eliminar la comunidad" },
            { status: 500 }
        );
    }
}

// PATCH /api/communities/[slug] - Editar comunidad (solo owner)
export async function PATCH(req: NextRequest, { params }: Params) {
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

        // Verificar que el usuario es el owner
        const membership = await db.query.communityMembers.findFirst({
            where: and(
                eq(communityMembers.communityId, community.id),
                eq(communityMembers.userId, user.id)
            ),
        });

        if (!membership || membership.role !== "owner") {
            return NextResponse.json(
                { error: "Solo el propietario puede editar la comunidad" },
                { status: 403 }
            );
        }

        const parsed = await parseBody(req, updateCommunitySchema);
        if (parsed.error) return parsed.error;
        const { name, description, iconUrl, category } = parsed.data;

        // Actualizar comunidad
        await db.update(communities)
            .set({
                name: name.trim(),
                description: description?.trim() || community.description,
                iconUrl: iconUrl || community.iconUrl,
                category: category || community.category,
            })
            .where(eq(communities.id, community.id));

        return NextResponse.json({
            success: true,
            message: "Comunidad actualizada",
        });
    } catch (error) {
        console.error("Error updating community:", error);
        return NextResponse.json(
            { error: "Error al actualizar la comunidad" },
            { status: 500 }
        );
    }
}
