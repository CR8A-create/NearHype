"use client";

import Link from "next/link";
import { Home, Sparkles, MessageCircle, Users } from "lucide-react";
import { usePathname } from "next/navigation";

interface BottomNavProps {
    unreadMessages?: number;
    pendingRequests?: number;
}

export default function BottomNav({ unreadMessages = 0, pendingRequests = 0 }: BottomNavProps) {
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === '/feed' && (pathname === '/feed' || pathname === '/')) return true;
        if (path === '/discover' && pathname === '/discover') return true;
        if (path === '/communities' && pathname.startsWith('/communities')) return true;
        if (path === '/messages' && pathname.startsWith('/messages')) return true;
        if (path === '/friends' && pathname.startsWith('/friends')) return true;
        return false;
    };

    const tabClass = (path: string) =>
        `flex flex-col items-center justify-center flex-1 py-3 gap-0.5 transition-colors ${isActive(path) ? 'text-indigo-400' : 'text-gray-500'}`;

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-gray-900/95 backdrop-blur-lg border-t border-white/10"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <Link href="/feed" className={tabClass('/feed')}>
                <Home className="w-6 h-6" />
                <span className="text-[10px] font-medium">Feed</span>
            </Link>

            <Link href="/communities" className={tabClass('/communities')}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-[10px] font-medium">Comunidades</span>
            </Link>

            <Link href="/discover" className={tabClass('/discover')}>
                <Sparkles className="w-6 h-6" />
                <span className="text-[10px] font-medium">Descubrir</span>
            </Link>

            <Link href="/messages" className={tabClass('/messages')}>
                <div className="relative">
                    <MessageCircle className="w-6 h-6" />
                    {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                            {unreadMessages > 99 ? '99+' : unreadMessages}
                        </span>
                    )}
                </div>
                <span className="text-[10px] font-medium">Mensajes</span>
            </Link>

            <Link href="/friends" className={tabClass('/friends')}>
                <div className="relative">
                    <Users className="w-6 h-6" />
                    {pendingRequests > 0 && (
                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                            {pendingRequests > 99 ? '99+' : pendingRequests}
                        </span>
                    )}
                </div>
                <span className="text-[10px] font-medium">Amigos</span>
            </Link>
        </nav>
    );
}
