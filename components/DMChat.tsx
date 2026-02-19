"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Image as ImageIcon, X } from "lucide-react";

type Message = {
    id: string;
    senderId: string;
    content: string;
    mediaUrl?: string;
    createdAt: Date;
};

type DMChatProps = {
    conversationId: string;
    otherUser: {
        id: string;
        username: string;
        avatarUrl?: string;
    };
    currentUserId: string;
};

export default function DMChat({ conversationId, otherUser, currentUserId }: DMChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const isNearBottomRef = useRef(true);

    // Track if user is scrolled near bottom to auto-scroll on new messages
    const checkIfNearBottom = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const threshold = 100; // px from bottom
        isNearBottomRef.current =
            container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    }, []);

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 2000); // Poll cada 2s
        return () => clearInterval(interval);
    }, [otherUser.id]);

    const loadMessages = async () => {
        try {
            const res = await fetch(`/api/dms/${otherUser.id}`);
            const data = await res.json();
            if (data.messages) {
                setMessages(prev => {
                    // Solo actualizar si hay cambios reales
                    if (prev.length !== data.messages.length ||
                        (prev.length > 0 && data.messages.length > 0 &&
                            prev[prev.length - 1].id !== data.messages[data.messages.length - 1].id)) {
                        // Auto-scroll solo si el usuario está cerca del final
                        if (isNearBottomRef.current) {
                            setTimeout(scrollToBottom, 50);
                        }
                        return data.messages;
                    }
                    return prev;
                });
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Initial scroll to bottom
    useEffect(() => {
        if (!isLoading && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }
    }, [isLoading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        const messageContent = newMessage.trim();
        setNewMessage("");

        // Optimistic UI: añadir mensaje localmente de inmediato
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: Message = {
            id: tempId,
            senderId: currentUserId,
            content: messageContent,
            createdAt: new Date(),
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setTimeout(scrollToBottom, 50);

        setIsSending(true);
        try {
            const res = await fetch(`/api/dms/${otherUser.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: messageContent }),
            });

            if (res.ok) {
                // Recargar mensajes del server para obtener el ID real
                await loadMessages();
            } else {
                // Rollback: eliminar el mensaje optimístico si falló
                setMessages(prev => prev.filter(m => m.id !== tempId));
                setNewMessage(messageContent); // Devolver el texto al input
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Rollback
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(messageContent);
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-900">
            {/* Header */}
            <div className="bg-gray-800 border-b border-white/10 p-4">
                <div className="flex items-center gap-3">
                    {otherUser.avatarUrl ? (
                        <img
                            src={otherUser.avatarUrl}
                            alt={otherUser.username}
                            className="w-10 h-10 rounded-full"
                        />
                    ) : (
                        <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white font-bold">
                            {otherUser.username[0].toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h2 className="text-white font-bold">{otherUser.username}</h2>
                        <p className="text-xs text-gray-500">Mensajes Directos</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                onScroll={checkIfNearBottom}
                className="flex-1 overflow-y-auto p-4 space-y-4"
                style={{ backgroundColor: 'var(--chat-bg, transparent)' }}
            >
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        No hay mensajes aún. ¡Envía el primero!
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-lg p-3 ${message.senderId !== currentUserId
                                        ? 'bg-gray-800 text-white'
                                        : 'text-white'
                                    } ${message.id.startsWith('temp-') ? 'opacity-70' : ''}`}
                                style={message.senderId === currentUserId ? { backgroundColor: 'var(--accent)' } : undefined}
                            >
                                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                {message.mediaUrl && (
                                    <img
                                        src={message.mediaUrl}
                                        alt="Media"
                                        className="mt-2 rounded max-w-full"
                                    />
                                )}
                                <p className="text-xs mt-1 opacity-70">
                                    {message.id.startsWith('temp-') ? 'Enviando...' :
                                        new Date(message.createdAt).toLocaleTimeString('es-ES', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                    }
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="border-t border-white/10 p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ring-accent"
                        disabled={isSending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isSending}
                        className="px-6 py-3 bg-accent bg-accent-hover text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                <span className="hidden sm:inline">Enviar</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
