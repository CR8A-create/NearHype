import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export routes para Next.js App Router
export const { GET, POST } = createRouteHandler({
    router: ourFileRouter,
    // La configuración se toma automáticamente de las variables de entorno:
    // UPLOADTHING_TOKEN (requerido en producción)
    // UPLOADTHING_URL (opcional, si se necesita override)
});
