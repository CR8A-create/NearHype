// app/api/notifications/mark-all-read/route.ts - PUT para marcar todas como leídas

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT() {
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

        // Marcar todas las notificaciones del usuario como leídas
        await db
            .update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.userId, user.id));

        return NextResponse.json({ success: true, message: "Todas las notificaciones marcadas como leídas" });
    } catch (error) {
        console.error('Error marking all as read:', error);
        return NextResponse.json(
            { error: "Error al marcar todas como leídas" },
            { status: 500 }
        );
    }
}
