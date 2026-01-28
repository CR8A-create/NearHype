import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { communities, communityMembers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/communities/[slug]/members
 * Obtener lista de miembros con sus roles
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { slug } = await params;

        // Buscar la comunidad
        const [community] = await db
            .select()
            .from(communities)
            .where(eq(communities.slug, slug))
            .limit(1);

        if (!community) {
            return NextResponse.json({ error: "Comunidad no encontrada" }, { status: 404 });
        }

        // Obtener todos los miembros con su información de usuario
        const members = await db
            .select({
                id: communityMembers.id,
                userId: communityMembers.userId,
                role: communityMembers.role,
                joinedAt: communityMembers.joinedAt,
                username: users.username,
                avatarUrl: users.avatarUrl,
            })
            .from(communityMembers)
            .innerJoin(users, eq(communityMembers.userId, users.id))
            .where(eq(communityMembers.communityId, community.id))
            .orderBy(communityMembers.joinedAt);

        // Ordenar: owner primero, luego admin, luego moderator, luego members
        const roleOrder: { [key: string]: number } = {
            'owner': 0,
            'admin': 1,
            'moderator': 2,
            'member': 3
        };

        members.sort((a, b) => {
            return (roleOrder[a.role || 'member'] || 3) - (roleOrder[b.role || 'member'] || 3);
        });

        return NextResponse.json({ members });

    } catch (error) {
        console.error("Error fetching members:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
