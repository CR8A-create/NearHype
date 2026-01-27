import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { communities, communityMembers, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{ slug: string }>;
};

// POST /api/communities/[slug]/join - Unirse a comunidad
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

        // Verificar si ya es miembro
        const existingMembership = await db.query.communityMembers.findFirst({
            where: and(
                eq(communityMembers.communityId, community.id),
                eq(communityMembers.userId, user.id)
            ),
        });

        if (existingMembership) {
            return NextResponse.json(
                { error: "Ya eres miembro de esta comunidad" },
                { status: 400 }
            );
        }

        // Unirse a la comunidad
        await db.insert(communityMembers).values({
            communityId: community.id,
            userId: user.id,
            role: "member",
        });

        // Incrementar contador de miembros
        await db.update(communities)
            .set({ memberCount: sql`${communities.memberCount} + 1` })
            .where(eq(communities.id, community.id));

        return NextResponse.json({
            success: true,
            message: "Te has unido a la comunidad",
        });
    } catch (error) {
        console.error("Error joining community:", error);
        return NextResponse.json(
            { error: "Error al unirse a la comunidad" },
            { status: 500 }
        );
    }
}

// DELETE /api/communities/[slug]/join - Salir de comunidad
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

        const membership = await db.query.communityMembers.findFirst({
            where: and(
                eq(communityMembers.communityId, community.id),
                eq(communityMembers.userId, user.id)
            ),
        });

        if (!membership) {
            return NextResponse.json(
                { error: "No eres miembro de esta comunidad" },
                { status: 400 }
            );
        }

        // No permitir que el owner abandone la comunidad
        if (membership.role === "owner") {
            return NextResponse.json(
                { error: "El propietario no puede abandonar la comunidad. Debes eliminarla o transferir la propiedad." },
                { status: 400 }
            );
        }

        // Salir de la comunidad
        await db.delete(communityMembers)
            .where(eq(communityMembers.id, membership.id));

        // Decrementar contador de miembros
        await db.update(communities)
            .set({ memberCount: sql`${communities.memberCount} - 1` })
            .where(eq(communities.id, community.id));

        return NextResponse.json({
            success: true,
            message: "Has abandonado la comunidad",
        });
    } catch (error) {
        console.error("Error leaving community:", error);
        return NextResponse.json(
            { error: "Error al abandonar la comunidad" },
            { status: 500 }
        );
    }
}
