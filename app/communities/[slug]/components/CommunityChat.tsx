"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Image as ImageIcon } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

export type Message = {
    id: string;
    content: string;
    mediaUrl?: string | null;
    linkUrl?: string | null;
    createdAt: string;
    author: { username: string; avatarUrl?: string };
    replyTo?: {
        id: string;
        content: string;
        author: { username: string };
    } | null;
};

export default function CommunityChat({ communitySlug }: { communitySlug: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Polling cada 3 segundos
    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 3000);
        return () => clearInterval(interval);
    }, [communitySlug]);

    // Auto-scroll al final cuando llegan nuevos mensajes
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const loadMessages = async () => {
        try {
            const res = await fetch(`/api/communities/${communitySlug}/messages`);
            const data = await res.json();
            setMessages(data.messages || []);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if ((!newMessage.trim() && !uploadedImageUrl) || isSending) return;

        setIsSending(true);

        try {
            const res = await fetch(`/api/communities/${communitySlug}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newMessage || '📷',
                    replyToId: replyingTo?.id || null,
                    imageUrl: uploadedImageUrl,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages([...messages, data.message]);
                setNewMessage('');
                setReplyingTo(null);
                setUploadedImageUrl(null);
                setShowImageUpload(false);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-white/5 rounded-xl h-[600px] flex flex-col">
            {/* Messages Area */}
            <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
            >
                {messages.length === 0 ? (
                    <div className="text-center py-20">
                        <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-300 mb-2">
                            No hay mensajes aún
                        </h3>
                        <p className="text-gray-500">
                            ¡Sé el primero en enviar un mensaje!
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageItem
                            key={msg.id}
                            message={msg}
                            onReply={() => setReplyingTo(msg)}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Replying To Banner */}
            {replyingTo && (
                <div className="border-t border-white/10 px-4 py-2 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm text-gray-400">
                            Respondiendo a <span className="text-white font-semibold">@{replyingTo.author.username}</span>
                        </span>
                        <span className="text-xs text-gray-500 truncate max-w-[200px]">
                            {replyingTo.content.substring(0, 50)}...
                        </span>
                    </div>
                    <button
                        onClick={() => setReplyingTo(null)}
                        className="text-gray-400 hover:text-white transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Image Upload Area */}
            {showImageUpload && (
                <div className="border-t border-white/10 px-4 py-3 bg-white/5">
                    <ImageUpload
                        endpoint="messageImage"
                        onUploadComplete={(url) => {
                            setUploadedImageUrl(url);
                            setShowImageUpload(false);
                        }}
                        onUploadError={(error) => {
                            console.error('Error uploading image:', error);
                            setShowImageUpload(false);
                        }}
                    />
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSend} className="border-t border-white/10 p-4">
                {uploadedImageUrl && (
                    <div className="mb-3 relative inline-block">
                        <img
                            src={uploadedImageUrl}
                            alt="Preview"
                            className="max-h-32 rounded-lg"
                        />
                        <button
                            type="button"
                            onClick={() => setUploadedImageUrl(null)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setShowImageUpload(!showImageUpload)}
                        className="p-3 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition"
                        title="Subir imagen"
                    >
                        <ImageIcon className="w-5 h-5 text-gray-300" />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        maxLength={1000}
                        className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !uploadedImageUrl) || isSending}
                        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? 'Enviando...' : 'Enviar'}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    {newMessage.length}/1000 caracteres
                </p>
            </form>
        </div>
    );
}

// Componente MessageItem con soporte para replies e imágenes
function MessageItem({
    message,
    onReply
}: {
    message: Message;
    onReply: () => void;
}) {
    const [showReplyButton, setShowReplyButton] = useState(false);

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div
            className="flex items-start gap-3 group"
            onMouseEnter={() => setShowReplyButton(true)}
            onMouseLeave={() => setShowReplyButton(false)}
        >
            {message.author.avatarUrl ? (
                <img
                    src={message.author.avatarUrl}
                    alt={message.author.username}
                    className="w-10 h-10 rounded-full"
                />
            ) : (
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                    {message.author.username[0].toUpperCase()}
                </div>
            )}
            <div className="flex-1">
                {/* Reply Reference */}
                {message.replyTo && (
                    <div className="mb-1 pl-3 border-l-2 border-indigo-500/50 bg-white/5 rounded p-2 text-xs">
                        <span className="text-indigo-400 font-semibold">
                            @{message.replyTo.author.username}
                        </span>
                        <p className="text-gray-400 truncate">
                            {message.replyTo.content.substring(0, 100)}
                        </p>
                    </div>
                )}

                <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-white">
                        {message.author.username}
                    </span>
                    <span className="text-xs text-gray-500">
                        {formatTime(message.createdAt!)}
                    </span>
                    {showReplyButton && (
                        <button
                            onClick={onReply}
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                        >
                            Responder
                        </button>
                    )}
                </div>

                {/* Image */}
                {message.mediaUrl && (
                    <img
                        src={message.mediaUrl}
                        alt="Imagen del mensaje"
                        className="max-w-sm rounded-lg mb-2"
                    />
                )}

                {/* Content */}
                <p className="text-gray-300">{message.content}</p>

                {/* Link Preview */}
                {message.linkUrl && <LinkPreview url={message.linkUrl} />}
            </div>
        </div>
    );
}

// Componente LinkPreview mejorado
function LinkPreview({ url }: { url: string }) {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const extractYouTubeId = (url: string): string | null => {
            const patterns = [
                /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) return match[1];
            }
            return null;
        };

        const videoId = extractYouTubeId(url);
        if (!videoId) return null;

        return (
            <div className="mt-2 rounded-lg overflow-hidden">
                <iframe
                    width="100%"
                    height="315"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                />
            </div>
        );
    }

    // Twitter/X
    if (url.includes('twitter.com') || url.includes('x.com')) {
        return (
            <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2"
                >
                    <MessageCircle className="w-4 h-4" />
                    Ver en X/Twitter
                </a>
            </div>
        );
    }

    // GitHub
    if (url.includes('github.com')) {
        return (
            <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-2"
                >
                    <MessageCircle className="w-4 h-4" />
                    Ver en GitHub
                </a>
            </div>
        );
    }

    // URL genérica
    return (
        <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-lg">
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 text-sm truncate block"
            >
                🔗 {url}
            </a>
        </div>
    );
}
