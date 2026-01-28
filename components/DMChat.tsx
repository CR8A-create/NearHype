"use client";

import { useState, useEffect, useRef } from "react";
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

    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 3000); // Poll cada 3s
        return () => clearInterval(interval);
    }, [otherUser.id]);

    const loadMessages = async () => {
        try {
            const res = await fetch(`/api/dms/${otherUser.id}`);
            const data = await res.json();
            if (data.messages) {
                setMessages(data.messages);
                scrollToBottom();
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

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            const res = await fetch(`/api/dms/${otherUser.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newMessage }),
            });

            if (res.ok) {
                setNewMessage("");
                await loadMessages();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
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
                        <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                                className={`max-w-[70%] rounded-lg p-3 ${message.senderId === currentUserId
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-800 text-white'
                                    }`}
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
                                    {new Date(message.createdAt).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
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
                        className="flex-1 px-4 py-3 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={isSending}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || isSending}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
