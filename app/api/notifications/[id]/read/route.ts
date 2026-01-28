// app/api/notifications/[id]/read/route.ts - PUT para marcar como leída

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{
        id: string;
    }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
    try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, clerkId),
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        const { id: notificationId } = await params;

        // Marcar como leída (solo si es del usuario)
        const result = await db
            .update(notifications)
            .set({ isRead: true })
            .where(
                and(
                    eq(notifications.id, notificationId),
                    eq(notifications.userId, user.id)
                )
            )
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
        }

        return NextResponse.json({ success: true, notification: result[0] });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return NextResponse.json(
            { error: "Error al marcar como leída" },
            { status: 500 }
        );
    }
}
