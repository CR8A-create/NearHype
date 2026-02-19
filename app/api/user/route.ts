import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await getOrCreateUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({
            id: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl,
        });
    } catch (error) {
        console.error("Error fetching current user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
