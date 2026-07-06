"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Image as Phone, Video } from "lucide-react";

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

export default function DMChat({ otherUser, currentUserId }: DMChatProps) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const isNearBottomRef = useRef(true);
    const sinceRef = useRef<Date>(new Date());
    const esRef = useRef<EventSource | null>(null);
    const backoffRef = useRef(1000);

    const startCall = async (callType: "video" | "audio") => {
        try {
            const res = await fetch("/api/calls", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ calleeId: otherUser.id, callType }),
            });
            const data = await res.json();
            if (data.room) {
                router.push(`/calls/${data.room.id}`);
            }
        } catch (error) {
            console.error("Error starting call:", error);
        }
    };

    // Track if user is scrolled near bottom to auto-scroll on new messages
    const checkIfNearBottom = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const threshold = 100; // px from bottom
        isNearBottomRef.current =
            container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    }, []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const connectSSE = useCallback(() => {
        if (esRef.current) esRef.current.close();

        const since = sinceRef.current.toISOString();
        const es = new EventSource(
            `/api/dms/stream?otherUserId=${encodeURIComponent(otherUser.id)}&since=${encodeURIComponent(since)}`
        );
        esRef.current = es;

        es.onopen = () => { backoffRef.current = 1000; };

        es.onmessage = (event) => {
            try {
                const { messages: newMsgs } = JSON.parse(event.data);
                if (!newMsgs?.length) return;

                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const toAdd = newMsgs.filter((m: Message) => !existingIds.has(m.id));
                    if (toAdd.length === 0) return prev;

                    // Remove optimistic temp messages that match incoming real messages
                    const incomingKeys = new Set(
                        toAdd.map((m: Message) => `${m.senderId}:${m.content}`)
                    );
                    const cleaned = prev.filter(m =>
                        !m.id.startsWith('temp-') || !incomingKeys.has(`${m.senderId}:${m.content}`)
                    );

                    if (isNearBottomRef.current) setTimeout(scrollToBottom, 50);
                    return [...cleaned, ...toAdd].sort(
                        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    );
                });

                sinceRef.current = new Date(newMsgs[newMsgs.length - 1].createdAt);
            } catch { /* malformed event */ }
        };

        es.onerror = () => {
            es.close();
            esRef.current = null;
            const delay = backoffRef.current;
            backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
            setTimeout(connectSSE, delay);
        };
    }, [otherUser.id, scrollToBottom]);

    const loadMessages = useCallback(async () => {
        try {
            const res = await fetch(`/api/dms/${otherUser.id}`);
            const data = await res.json();
            if (data.messages) {
                setMessages(data.messages);
                if (isNearBottomRef.current) setTimeout(scrollToBottom, 50);
                // Advance since so SSE only fetches new messages after initial history
                if (data.messages.length > 0) {
                    sinceRef.current = new Date(data.messages[data.messages.length - 1].createdAt);
                }
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsLoading(false);
        }
    }, [otherUser.id, scrollToBottom]);

    useEffect(() => {
        sinceRef.current = new Date(Date.now() - 2000);
        loadMessages();
        connectSSE();
        return () => {
            esRef.current?.close();
            esRef.current = null;
        };
    }, [otherUser.id, connectSSE, loadMessages]);

    // Initial scroll to bottom
    useEffect(() => {
        if (!isLoading && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe saltar al final al terminar la carga inicial, no con cada mensaje nuevo
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

            if (!res.ok) {
                // Rollback: eliminar el mensaje optimístico si falló
                setMessages(prev => prev.filter(m => m.id !== tempId));
                setNewMessage(messageContent); // Devolver el texto al input
            }
            // On success: SSE will deliver the real message and replace the temp one
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
                        <img loading="lazy" decoding="async"
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
                    {/* Call buttons */}
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => startCall("audio")}
                            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition"
                            title="Llamada de voz"
                        >
                            <Phone className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => startCall("video")}
                            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition"
                            title="Videollamada"
                        >
                            <Video className="w-4 h-4" />
                        </button>
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
                    messages.map((message) => {
                        // Mensajes de llamada como evento de sistema
                        if (message.content.startsWith("[CALL] ")) {
                            const callText = message.content.replace("[CALL] ", "");
                            return (
                                <div key={message.id} className="flex justify-center my-2">
                                    <div className="bg-gray-800/50 border border-white/5 rounded-full px-4 py-1.5 text-xs text-gray-400 flex items-center gap-2">
                                        {callText.includes("Video") ? (
                                            <Video className="w-3 h-3" />
                                        ) : (
                                            <Phone className="w-3 h-3" />
                                        )}
                                        <span>{callText}</span>
                                        <span className="opacity-50">
                                            {new Date(message.createdAt).toLocaleTimeString('es-ES', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </div>
                            );
                        }

                        return (
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
                                        <img loading="lazy" decoding="async"
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
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="border-t border-white/10 p-4 pb-20 md:pb-4">
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
