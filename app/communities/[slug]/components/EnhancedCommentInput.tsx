"use client";

import { useState } from "react";
import { Image, Link2, Smile, Loader2, X } from "lucide-react";

type EnhancedCommentInputProps = {
    postId: string;
    parentCommentId?: string;
    onCommentAdded: (comment: any) => void;
    placeholder?: string;
};

const EMOJI_LIST = ['😀', '😂', '😍', '🔥', '👍', '👎', '🎉', '💯', '🤔', '👌', '💪', '🙌', '❤️', '😎', '🚀', '✨'];

export default function EnhancedCommentInput({ postId, parentCommentId, onCommentAdded, placeholder = "Escribe un comentario..." }: EnhancedCommentInputProps) {
    const [content, setContent] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [showMediaInput, setShowMediaInput] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!content.trim() && !mediaUrl && !linkUrl) {
            setError('El comentario no puede estar vacío');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content.trim(),
                    mediaUrl: mediaUrl.trim() || null,
                    linkUrl: linkUrl.trim() || null,
                    parentCommentId: parentCommentId || null,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                onCommentAdded(data.comment);
                // Reset form
                setContent('');
                setMediaUrl('');
                setLinkUrl('');
                setShowMediaInput(false);
                setShowLinkInput(false);
            } else {
                setError(data.error || 'Error al publicar comentario');
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            setError('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    const addEmoji = (emoji: string) => {
        setContent(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            {/* Text Input */}
            <div className="relative">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    maxLength={2000}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
            </div>

            {/* Media URL Input */}
            {showMediaInput && (
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        placeholder="URL de imagen o GIF"
                        className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setShowMediaInput(false);
                            setMediaUrl('');
                        }}
                        className="p-2 text-gray-400 hover:text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Link URL Input */}
            {showLinkInput && (
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="URL del enlace"
                        className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setShowLinkInput(false);
                            setLinkUrl('');
                        }}
                        className="p-2 text-gray-400 hover:text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Image Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowMediaInput(!showMediaInput);
                            setShowLinkInput(false);
                        }}
                        className={`p-2 rounded-lg transition ${showMediaInput ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                        title="Agregar imagen/GIF"
                    >
                        <Image className="w-5 h-5" />
                    </button>

                    {/* Link Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowLinkInput(!showLinkInput);
                            setShowMediaInput(false);
                        }}
                        className={`p-2 rounded-lg transition ${showLinkInput ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                        title="Agregar enlace"
                    >
                        <Link2 className="w-5 h-5" />
                    </button>

                    {/* Emoji Button */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-2 rounded-lg transition ${showEmojiPicker ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                            title="Agregar emoji"
                        >
                            <Smile className="w-5 h-5" />
                        </button>

                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                            <>
                                <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                                <div className="absolute bottom-12 left-0 bg-gray-800 border border-white/10 rounded-lg p-2 shadow-lg z-10 flex flex-wrap gap-1 w-64">
                                    {EMOJI_LIST.map((emoji) => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            onClick={() => addEmoji(emoji)}
                                            className="w-10 h-10 hover:bg-white/10 rounded transition text-2xl"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting || (!content.trim() && !mediaUrl && !linkUrl)}
                    className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Comentar
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
                    {error}
                </div>
            )}
        </form>
    );
}
