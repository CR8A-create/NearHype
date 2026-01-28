"use client";

import Link from "next/link";
import { MapPin, Sparkles, Home, RefreshCcw, ArrowLeft } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";

export default function GlobalHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();

    const isActive = (path: string) => {
        if (path === '/feed' && (pathname === '/feed' || pathname === '/')) return true;
        if (path === '/discover' && pathname === '/discover') return true;
        if (path === '/communities' && pathname.startsWith('/communities')) return true;
        return false;
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    // Detectar si estamos en una comunidad específica (no en la lista de comunidades)
    const isInSpecificCommunity = pathname.match(/^\/communities\/[^\/]+$/);

    return (
        <header className="bg-gray-900/95 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Logo con botón Atrás condicional */}
                    <div className="flex items-center gap-3">
                        {isInSpecificCommunity && (
                            <button
                                onClick={() => router.back()}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                                title="Volver"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <Link href="/feed" className="flex items-center gap-3 hover:opacity-80 transition">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <MapPin className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent hidden sm:block">
                                NearHype
                            </span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1 sm:gap-2">
                        {/* Descubrir */}
                        <Link
                            href="/discover"
                            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition ${isActive('/discover')
                                ? 'bg-indigo-600/20 text-indigo-400'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Sparkles className="w-5 h-5" />
                            <span className="hidden sm:inline">Descubrir</span>
                        </Link>

                        {/* Feed / Comunidades */}
                        {pathname.startsWith('/communities') && !pathname.match(/^\/communities\/[^\/]+$/) ? (
                            <Link
                                href="/communities"
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold bg-indigo-600/20 text-indigo-400"
                            >
                                <Home className="w-5 h-5" />
                                <span className="hidden sm:inline">Comunidades</span>
                            </Link>
                        ) : (
                            <Link
                                href="/feed"
                                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition ${isActive('/feed')
                                    ? 'bg-indigo-600/20 text-indigo-400'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Home className="w-5 h-5" />
                                <span className="hidden sm:inline">Feed</span>
                            </Link>
                        )}

                        {/* Refrescar */}
                        <button
                            onClick={handleRefresh}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition"
                            title="Refrescar"
                        >
                            <RefreshCcw className="w-5 h-5" />
                            <span className="hidden sm:inline">Refrescar</span>
                        </button>

                        {/* User Button (con configuración integrada) */}
                        {user && (
                            <div className="ml-2">
                                <UserButton
                                    appearance={{
                                        elements: {
                                            avatarBox: "w-10 h-10 ring-2 ring-indigo-500/30 hover:ring-indigo-500/60 transition",
                                        },
                                    }}
                                    afterSignOutUrl="/"
                                />
                            </div>
                        )}
                    </nav>
                </div>
            </div>
        </header>
    );
}
