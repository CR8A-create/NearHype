"use client";

import Link from "next/link";
import { MapPin, Sparkles, Home, RefreshCcw, ArrowLeft, Settings } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import SettingsModal from "./SettingsModal";
import NotificationBell from "./NotificationBell";

export default function GlobalHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();
    const [showSettings, setShowSettings] = useState(false);

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
        <>
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

                            {/* Feed */}
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

                            {/* Comunidades */}
                            <Link
                                href="/communities"
                                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition ${isActive('/communities')
                                    ? 'bg-indigo-600/20 text-indigo-400'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="hidden sm:inline">Comunidades</span>
                            </Link>

                            {/* Refrescar */}
                            <button
                                onClick={handleRefresh}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition"
                                title="Refrescar"
                            >
                                <RefreshCcw className="w-5 h-5" />
                                <span className="hidden sm:inline">Refrescar</span>
                            </button>

                            {/* Configuración */}
                            <button
                                onClick={() => setShowSettings(true)}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition"
                                title="Configuración"
                            >
                                <Settings className="w-5 h-5" />
                                <span className="hidden sm:inline">Config</span>
                            </button>

                            {/* Notificaciones */}
                            <NotificationBell />

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

            {/* Modal de Configuración */}
            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </>
    );
}
