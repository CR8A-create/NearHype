import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export routes para Next.js App Router con configuración explícita
export const { GET, POST } = createRouteHandler({
    router: ourFileRouter,
    config: {
        // Deshabilitar polling de callbacks en desarrollo (localhost)
        // UploadThing no puede hacer callbacks a localhost desde su servidor
        skipPolling: process.env.NODE_ENV === 'development',
        callbackUrl: process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/api/uploadthing`
            : undefined,
        logLevel: "Info",
    },
});
