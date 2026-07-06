"use client";

import { useState, useEffect } from "react";
import { Users, X, Loader2, MessageCircle } from "lucide-react";
import Link from "next/link";

type Friend = {
    id: string;
    username: string;
    avatarUrl?: string;
    friendsSince?: Date;
};

export default function FriendsList() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, friend: Friend } | null>(null);

    useEffect(() => {
        loadFriends();

        const handleClickOutside = () => setContextMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, friend: Friend) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            friend
        });
    };

    const handleRemoveFriend = async (friend: Friend) => {
        if (!confirm(`¿Eliminar a ${friend.username} de tus amigos?`)) return;

        try {
            const res = await fetch(`/api/friends/${friend.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                loadFriends();
                setContextMenu(null);
            }
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    };

    const loadFriends = async () => {
        try {
            const res = await fetch('/api/friends');
            const data = await res.json();
            setFriends(data.friends || []);
        } catch (error) {
            console.error('Error loading friends:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredFriends = friends.filter(friend =>
        friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isCollapsed) {
        return (
            <div className="fixed right-4 top-24 z-40">
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition"
                    title="Mostrar amigos"
                >
                    <Users className="w-6 h-6" />
                    {friends.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {friends.length}
                        </span>
                    )}
                </button>
            </div>
        );
    }

    return (
        <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-full md:w-80 bg-gray-900 border-l border-white/10 shadow-xl z-40 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-white font-bold">
                        Amigos ({friends.length})
                    </h2>
                </div>
                <button
                    onClick={() => setIsCollapsed(true)}
                    className="text-gray-400 hover:text-white transition"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-white/10">
                <input
                    type="text"
                    placeholder="Buscar amigos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Friends List */}
            <div className="flex-1 overflow-y-auto" onClick={() => setContextMenu(null)}>
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                ) : filteredFriends.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">
                            {searchQuery
                                ? "No se encontraron amigos"
                                : friends.length === 0
                                    ? "Aún no tienes amigos"
                                    : "No se encontraron resultados"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {filteredFriends.map((friend) => (
                            <div
                                key={friend.id}
                                className="p-3 hover:bg-white/5 transition cursor-context-menu"
                                onContextMenu={(e) => handleContextMenu(e, friend)}
                            >
                                <div className="flex items-center gap-3">
                                    {friend.avatarUrl ? (
                                        <img loading="lazy" decoding="async"
                                            src={friend.avatarUrl}
                                            alt={friend.username}
                                            className="w-10 h-10 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                            {friend.username[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-semibold truncate">
                                            {friend.username}
                                        </p>
                                        {friend.friendsSince && (
                                            <p className="text-xs text-gray-500">
                                                Amigos desde {new Date(friend.friendsSince).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-gray-800 border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <div className="py-1">
                        <Link
                            href={`/messages?user=${contextMenu.friend.username}`}
                            className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 transition flex items-center gap-3"
                        >
                            <MessageCircle className="w-4 h-4 text-indigo-400" />
                            Enviar mensaje
                        </Link>
                        <button
                            onClick={() => handleRemoveFriend(contextMenu.friend)}
                            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition flex items-center gap-3 border-t border-white/5"
                        >
                            <X className="w-4 h-4" />
                            Eliminar amigo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
