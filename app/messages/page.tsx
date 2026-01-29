"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { MessageCircle, Loader2, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
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

function MessagesContent() {
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
    }, []);

    useEffect(() => {
        // Si hay parámetro user, buscar esa conversación o crearla
        const handleUserParam = async () => {
            if (userParam && !isLoading) {
                // Primero intentamos buscarla en local
                const exisintgConv = conversations.find(c => c.otherUser.username === userParam);
                if (exisintgConv) {
                    setSelectedConversation(exisintgConv);
                } else {
                    // Si no existe, la creamos/obtenemos del servidor
                    try {
                        const res = await fetch('/api/dms', {
                            method: 'POST',
                            body: JSON.stringify({ targetUsername: userParam }),
                        });
                        const data = await res.json();
                        if (res.ok && data.conversation) {
                            setConversations(prev => [data.conversation, ...prev]);
                            setSelectedConversation(data.conversation);
                        }
                    } catch (error) {
                        console.error('Error creating conversation:', error);
                    }
                }
            }
        };

        handleUserParam();
    }, [userParam, isLoading]); // added isLoading dependency to wait for init load

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

    const filteredConversations = conversations.filter(conv =>
        conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-screen bg-gray-900 flex">
            {/* Sidebar - Lista de conversaciones */}
            <div className="w-80 border-r border-white/10 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                        <Link href="/feed" className="p-2 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <MessageCircle className="w-6 h-6" />
                            Mensajes
                        </h1>
                    </div>
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
            {selectedConversation ? (
                <DMChat
                    conversationId={selectedConversation.id}
                    otherUser={selectedConversation.otherUser}
                    currentUserId={currentUserId}
                />
            ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-900">
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

export default function MessagesPage() {
    return (
        <Suspense fallback={
            <div className="h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        }>
            <MessagesContent />
        </Suspense>
    );
}
