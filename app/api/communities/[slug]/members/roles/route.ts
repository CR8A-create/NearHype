import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { communities, communityMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/communities/[slug]/members/roles
 * Actualizar el rol de un miembro
 * Solo owner y admin pueden cambiar roles
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { slug } = await params;
        const body = await request.json();
        const { targetUserId, newRole } = body;

        if (!targetUserId || !newRole) {
            return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
        }

        // Validar que newRole sea válido
        const validRoles = ['member', 'moderator', 'admin'];
        if (!validRoles.includes(newRole)) {
            return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
        }

        // Buscar la comunidad
        const [community] = await db
            .select()
            .from(communities)
            .where(eq(communities.slug, slug))
            .limit(1);

        if (!community) {
            return NextResponse.json({ error: "Comunidad no encontrada" }, { status: 404 });
        }

        // Obtener membresía del usuario actual
        const [currentUserMember] = await db
            .select()
            .from(communityMembers)
            .where(
                and(
                    eq(communityMembers.communityId, community.id),
                    eq(communityMembers.userId, user.id)
                )
            )
            .limit(1);

        if (!currentUserMember) {
            return NextResponse.json({ error: "No eres miembro de esta comunidad" }, { status: 403 });
        }

        // Obtener membresía del usuario target
        const [targetMember] = await db
            .select()
            .from(communityMembers)
            .where(
                and(
                    eq(communityMembers.communityId, community.id),
                    eq(communityMembers.userId, targetUserId)
                )
            )
            .limit(1);

        if (!targetMember) {
            return NextResponse.json({ error: "Usuario objetivo no es miembro" }, { status: 404 });
        }

        // LÓGICA DE PERMISOS
        const currentRole = currentUserMember.role;

        // Solo owner y admin pueden cambiar roles
        if (currentRole !== 'owner' && currentRole !== 'admin') {
            return NextResponse.json({ error: "No tienes permisos para gestionar roles" }, { status: 403 });
        }

        // No se puede cambiar el rol del owner
        if (targetMember.role === 'owner') {
            return NextResponse.json({ error: "No se puede cambiar el rol del creador" }, { status: 403 });
        }

        // Admin no puede promover a admin ni degradar a admin
        if (currentRole === 'admin') {
            if (newRole === 'admin') {
                return NextResponse.json({ error: "Solo el owner puede promover a admin" }, { status: 403 });
            }
            if (targetMember.role === 'admin') {
                return NextResponse.json({ error: "No puedes modificar el rol de un admin" }, { status: 403 });
            }
        }

        // Actualizar el rol
        await db
            .update(communityMembers)
            .set({ role: newRole })
            .where(eq(communityMembers.id, targetMember.id));

        return NextResponse.json({
            success: true,
            message: `Rol actualizado a ${newRole}`,
            newRole
        });

    } catch (error) {
        console.error("Error updating role:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
