"use client";

import Link from "next/link";
import { MapPin, Sparkles, Home, RefreshCcw, ArrowLeft, Settings, UserPlus, MessageCircle } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import SettingsModal from "./SettingsModal";
import NotificationBell from "./NotificationBell";
import FriendRequestsModal from "./FriendRequestsModal";
import FriendsList from "./FriendsList";
import IncomingCallModal from "./IncomingCallModal";
import BottomNav from "./BottomNav";

export default function GlobalHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showFriendRequests, setShowFriendRequests] = useState(false);
    const [showFriendsList, setShowFriendsList] = useState(false);

    // Notification states
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [pendingRequests, setPendingRequests] = useState(0);

    // Audio for notifications
    const playNotificationSound = () => {
        try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.play().catch(e => console.log('Audio play failed (interaction needed):', e));
        } catch (e) {
            console.error('Audio error', e);
        }
    };

    const fetchStatus = async () => {
        if (!user) return;
        try {
            const res = await fetch('/api/user/status');
            if (!res.ok) return;
            const data = await res.json();

            if (data.unreadMessages > unreadMessages || data.pendingRequests > pendingRequests) {
                playNotificationSound();
            }

            setUnreadMessages(data.unreadMessages || 0);
            setPendingRequests(data.pendingRequests || 0);
        } catch (e) {
            // silent - avoid console spam
        }
    };

    // Poll every 30 seconds (reduced to avoid Clerk rate limits)
    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, [user, unreadMessages, pendingRequests]);

    const isActive = (path: string) => {
        if (path === '/feed' && (pathname === '/feed' || pathname === '/')) return true;
        if (path === '/discover' && pathname === '/discover') return true;
        if (path === '/communities' && pathname.startsWith('/communities')) return true;
        return false;
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const isInSpecificCommunity = pathname.match(/^\/communities\/[^\/]+$/);

    // Shared nav link style helper
    const navLinkClass = (path: string, isMobile = false) =>
        `flex items-center gap-3 ${isMobile ? 'px-4 py-3 w-full' : 'px-3 sm:px-4 py-2'} rounded-lg font-semibold transition ${isActive(path)
            ? 'bg-accent/20 text-accent'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`;

    const navButtonClass = (isMobile = false) =>
        `flex items-center gap-3 ${isMobile ? 'px-4 py-3 w-full' : 'px-3 sm:px-4 py-2'} rounded-lg font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition`;

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

                        {/* Desktop Navigation - hidden on mobile */}
                        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
                            <Link href="/discover" className={navLinkClass('/discover')}>
                                <Sparkles className="w-5 h-5" />
                                <span className="hidden lg:inline">Descubrir</span>
                            </Link>

                            <Link href="/feed" className={navLinkClass('/feed')}>
                                <Home className="w-5 h-5" />
                                <span className="hidden lg:inline">Feed</span>
                            </Link>

                            <Link href="/communities" className={navLinkClass('/communities')}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="hidden lg:inline">Comunidades</span>
                            </Link>

                            <Link href="/messages" className={`${navLinkClass('/messages')} relative`}>
                                <MessageCircle className="w-5 h-5" />
                                <span className="hidden lg:inline">Mensajes</span>
                                {unreadMessages > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                                        {unreadMessages > 99 ? '99+' : unreadMessages}
                                    </span>
                                )}
                            </Link>

                            <button onClick={handleRefresh} className={navButtonClass()} title="Refrescar">
                                <RefreshCcw className="w-5 h-5" />
                            </button>

                            <button onClick={() => setShowSettingsModal(true)} className={navButtonClass()} title="Configuración">
                                <Settings className="w-5 h-5" />
                            </button>

                            <button onClick={() => setShowFriendRequests(true)} className={`${navButtonClass()} relative`} title="Solicitudes de amistad">
                                <UserPlus className="w-5 h-5" />
                                {pendingRequests > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                                        {pendingRequests > 99 ? '99+' : pendingRequests}
                                    </span>
                                )}
                            </button>

                            <NotificationBell />

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

                        {/* Mobile: key actions */}
                        <div className="flex md:hidden items-center gap-2">
                            <NotificationBell />
                            {user && (
                                <UserButton
                                    appearance={{
                                        elements: {
                                            avatarBox: "w-8 h-8 ring-2 ring-indigo-500/30",
                                        },
                                    }}
                                    afterSignOutUrl="/"
                                />
                            )}
                        </div>
                    </div>
                </div>

            </header>

            {/* Modal de Configuración */}
            {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}

            {/* Modal de solicitudes de amistad */}
            {showFriendRequests && (
                <FriendRequestsModal
                    onClose={() => setShowFriendRequests(false)}
                />
            )}

            {/* Sidebar de amigos - solo desktop */}
            {showFriendsList && (
                <div className="hidden md:block">
                    <FriendsList />
                </div>
            )}

            {/* Bottom navigation bar - mobile only */}
            <BottomNav
                unreadMessages={unreadMessages}
                pendingRequests={pendingRequests}
                onSettingsClick={() => setShowSettingsModal(true)}
            />

            {/* Incoming call overlay - Always mounted */}
            <IncomingCallModal />
        </>
    );
}
