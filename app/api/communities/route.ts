import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { communities, communityMembers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/communities - Listar todas las comunidades
export async function GET() {
    try {
        const allCommunities = await db.query.communities.findMany({
            with: {
                creator: {
                    columns: {
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: (communities, { desc }) => [desc(communities.memberCount)],
            limit: 50,
        });

        return NextResponse.json({
            communities: allCommunities,
        });
    } catch (error) {
        console.error("Error fetching communities:", error);
        return NextResponse.json(
            { error: "Error al cargar comunidades" },
            { status: 500 }
        );
    }
}

// POST /api/communities - Crear nueva comunidad
export async function POST(req: NextRequest) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const body = await req.json();
        const { name, description, category, iconUrl } = body;

        // Validaciones
        if (!name || name.length < 3) {
            return NextResponse.json(
                { error: "El nombre debe tener al menos 3 caracteres" },
                { status: 400 }
            );
        }

        if (!category) {
            return NextResponse.json(
                { error: "Debes seleccionar una categoría" },
                { status: 400 }
            );
        }

        // Obtener usuario de la DB
        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!user) {
            return NextResponse.json(
                { error: "Usuario no encontrado" },
                { status: 404 }
            );
        }

        // Generar slug único
        const slug = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

        // Verificar que el slug no exista
        const existingCommunity = await db.query.communities.findFirst({
            where: eq(communities.slug, slug),
        });

        if (existingCommunity) {
            return NextResponse.json(
                { error: "Ya existe una comunidad con ese nombre" },
                { status: 400 }
            );
        }

        // Crear comunidad
        const [newCommunity] = await db.insert(communities).values({
            name,
            slug,
            description: description || null,
            iconUrl: iconUrl || null,
            category,
            createdBy: user.id,
            memberCount: 1, // El creador es el primer miembro
        }).returning();

        // Añadir al creador como miembro con rol "owner"
        await db.insert(communityMembers).values({
            communityId: newCommunity.id,
            userId: user.id,
            role: "owner",
        });

        return NextResponse.json({
            success: true,
            community: newCommunity,
        });
    } catch (error) {
        console.error("Error creating community:", error);
        return NextResponse.json(
            { error: "Error al crear la comunidad" },
            { status: 500 }
        );
    }
}
