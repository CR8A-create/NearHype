/**
 * Database Connection (Drizzle + Neon PostgreSQL)
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está configurada en .env.local");
}

// Conexión a PostgreSQL
const client = postgres(process.env.DATABASE_URL);

// Inicializar Drizzle con el schema
export const db = drizzle(client, { schema });
