// lib/validation.ts
// Esquemas Zod y helper de validación para los bodies de las rutas API.
// Los máximos se alinean con las columnas de lib/db/schema.ts.

import { z } from "zod";
import { NextResponse } from "next/server";

// URL opcional: acepta undefined, null o "" (los clientes actuales envían
// cualquiera de los tres cuando no hay valor) y los normaliza a undefined.
const optionalUrl = z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().url("URL inválida").max(2048).optional()
);

const optionalUuid = z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().uuid("Identificador inválido").optional()
);

/** POST /api/communities/[slug]/posts */
export const createPostSchema = z
    .object({
        title: z.string().trim().min(3, "El título debe tener al menos 3 caracteres").max(300, "El título no puede superar 300 caracteres"),
        content: z.string().max(40_000, "El contenido es demasiado largo").optional().nullable(),
        contentType: z.enum(["text", "image", "link"]).optional(),
        mediaUrl: optionalUrl,
        linkUrl: optionalUrl,
    })
    .refine((d) => d.contentType !== "link" || !!d.linkUrl, {
        message: "Debes proporcionar una URL para posts de tipo link",
    });

/** PATCH /api/posts/[id] */
export const updatePostSchema = z.object({
    title: z.string().trim().min(1, "El título es obligatorio").max(300, "El título no puede superar 300 caracteres"),
    content: z.string().max(40_000, "El contenido es demasiado largo").optional().nullable(),
    mediaUrl: optionalUrl,
    linkUrl: optionalUrl,
});

/** POST /api/posts/[id]/comments */
export const createCommentSchema = z.object({
    content: z.string().trim().min(1, "El comentario no puede estar vacío").max(10_000, "El comentario es demasiado largo"),
    parentCommentId: optionalUuid,
    mediaUrl: optionalUrl,
    linkUrl: optionalUrl,
});

/** POST /api/communities/[slug]/messages */
export const createMessageSchema = z.object({
    content: z.string().trim().min(1, "El mensaje no puede estar vacío").max(1000, "Mensaje inválido (máx 1000 caracteres)"),
    replyToId: optionalUuid,
    imageUrl: optionalUrl,
});

/** POST /api/dms/[userId] */
export const createDmSchema = z.object({
    content: z.string().trim().min(1, "El mensaje no puede estar vacío").max(4000, "El mensaje es demasiado largo"),
    mediaUrl: optionalUrl,
});

/** POST /api/communities */
export const createCommunitySchema = z.object({
    name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(100, "El nombre no puede superar 100 caracteres"),
    description: z.string().max(2000, "La descripción es demasiado larga").optional().nullable(),
    category: z.string().trim().min(1, "Debes seleccionar una categoría").max(50),
    iconUrl: optionalUrl,
});

/**
 * Parsea y valida el body JSON de una request.
 * Devuelve `{ data }` si es válido o `{ error }` con una NextResponse 400 lista para retornar.
 */
export async function parseBody<S extends z.ZodType>(
    req: Request,
    schema: S
): Promise<{ data: z.infer<S>; error?: never } | { data?: never; error: NextResponse }> {
    let raw: unknown;
    try {
        raw = await req.json();
    } catch {
        return { error: NextResponse.json({ error: "JSON inválido" }, { status: 400 }) };
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
        const msg = result.error.issues[0]?.message || "Datos inválidos";
        return { error: NextResponse.json({ error: msg }, { status: 400 }) };
    }
    return { data: result.data };
}
