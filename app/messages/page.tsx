"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { MessageCircle, Loader2, Search, ArrowLeft } from "lucide-react";
import DMChat from "@/components/DMChat";

type Conversation = {
    id: string;
    otherUser: {
        id: string;
        username: string;
        avatarUrl?: string;
    };
    lastMessage: {
        content: string;
        createdAt: Date;
        senderId: string;
    } | null;
    unreadCount: number;
    lastMessageAt: Date;
};

export default function MessagesPageWrapper() {
    return (
        <Suspense fallback={
            <div className="h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        }>
            <MessagesPage />
        </Suspense>
    );
}

function MessagesPage() {
    const { user: clerkUser } = useUser();
    const searchParams = useSearchParams();
    const userParam = searchParams?.get('user');

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentUserId, setCurrentUserId] = useState("");

    useEffect(() => {
        loadConversations();
        getCurrentUserId();
        // Poll conversations every 5s to update last message and unread counts
        const interval = setInterval(loadConversations, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Si hay parámetro user, buscar esa conversación o crearla
        if (userParam && !isLoading) {
            const conv = conversations.find(c => c.otherUser.username === userParam);
            if (conv) {
                setSelectedConversation(conv);
            } else {
                // No hay conversación existente → crear una temporal buscando al usuario
                createTemporaryConversation(userParam);
            }
        }
    }, [userParam, conversations, isLoading]);

    const getCurrentUserId = async () => {
        try {
            const res = await fetch('/api/user');
            const data = await res.json();
            if (data.id) {
                setCurrentUserId(data.id);
            }
        } catch (error) {
            console.error('Error getting current user:', error);
        }
    };

    const loadConversations = async () => {
        try {
            const res = await fetch('/api/dms');
            const data = await res.json();
            setConversations(data.conversations || []);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const createTemporaryConversation = async (username: string) => {
        try {
            const res = await fetch(`/api/users?username=${encodeURIComponent(username)}`);
            const data = await res.json();

            if (data.user) {
                // Crear conversación temporal (sin ID real — se creará al enviar el primer mensaje)
                const tempConv: Conversation = {
                    id: `temp-${data.user.id}`,
                    otherUser: {
                        id: data.user.id,
                        username: data.user.username,
                        avatarUrl: data.user.avatarUrl,
                    },
                    lastMessage: null,
                    unreadCount: 0,
                    lastMessageAt: new Date(),
                };
                setSelectedConversation(tempConv);
            }
        } catch (error) {
            console.error('Error creating temporary conversation:', error);
        }
    };

    const filteredConversations = conversations.filter(conv =>
        conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-screen bg-gray-900 flex flex-col md:flex-row">
            {/* Sidebar - Lista de conversaciones */}
            {/* On mobile: hidden when a conversation is selected */}
            <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-white/10 flex-col flex-shrink-0`}>
                {/* Header */}
                <div className="p-4 border-b border-white/10">
                    <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                        <MessageCircle className="w-6 h-6" />
                        Mensajes
                    </h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar conversaciones..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Lista de conversaciones */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">
                                {searchQuery
                                    ? "No se encontraron conversaciones"
                                    : conversations.length === 0
                                        ? "No tienes conversaciones aún"
                                        : "No se encontraron resultados"}
                            </p>
                            {conversations.length === 0 && (
                                <p className="text-gray-600 text-xs mt-2">
                                    Envía un mensaje desde el perfil de un amigo
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredConversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv)}
                                    className={`w-full p-4 hover:bg-white/5 transition text-left ${selectedConversation?.id === conv.id ? 'bg-white/10' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {conv.otherUser.avatarUrl ? (
                                            <img
                                                src={conv.otherUser.avatarUrl}
                                                alt={conv.otherUser.username}
                                                className="w-12 h-12 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                                {conv.otherUser.username[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-white font-semibold truncate">
                                                    {conv.otherUser.username}
                                                </p>
                                                {conv.unreadCount > 0 && (
                                                    <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-1 ml-2">
                                                        {conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            {conv.lastMessage && (
                                                <p className="text-sm text-gray-500 truncate">
                                                    {conv.lastMessage.content}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Área de chat */}
            {/* On mobile: shown fullscreen when conversation selected */}
            {selectedConversation ? (
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Mobile back button */}
                    <div className="md:hidden flex items-center gap-3 p-3 border-b border-white/10 bg-gray-900">
                        <button
                            onClick={() => setSelectedConversation(null)}
                            className="p-2 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            {selectedConversation.otherUser.avatarUrl ? (
                                <img src={selectedConversation.otherUser.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {selectedConversation.otherUser.username[0].toUpperCase()}
                                </div>
                            )}
                            <span className="text-white font-semibold">{selectedConversation.otherUser.username}</span>
                        </div>
                    </div>
                    <DMChat
                        conversationId={selectedConversation.id}
                        otherUser={selectedConversation.otherUser}
                        currentUserId={currentUserId}
                    />
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center bg-gray-900">
                    <div className="text-center">
                        <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500">
                            Selecciona una conversación para empezar a chatear
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
