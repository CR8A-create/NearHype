"use client";

import { useState } from "react";
import { Image as ImageIcon, Smile, Loader2, X } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import type { CommentData } from "./Comments";

type EnhancedCommentInputProps = {
    postId: string;
    parentCommentId?: string;
    onCommentAdded: (comment: CommentData) => void;
    placeholder?: string;
};

const EMOJI_LIST = ['😀', '😂', '😍', '🔥', '👍', '👎', '🎉', '💯', '🤔', '👌', '💪', '🙌', '❤️', '😎', '🚀', '✨'];

export default function EnhancedCommentInput({ postId, parentCommentId, onCommentAdded, placeholder = "Escribe un comentario..." }: EnhancedCommentInputProps) {
    const [content, setContent] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!content.trim() && !mediaUrl) {
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
                    linkUrl: null,
                    parentCommentId: parentCommentId || null,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                onCommentAdded(data.comment);
                // Reset form
                setContent('');
                setMediaUrl('');
                setShowImageUpload(false);
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

            {/* Image Upload */}
            {showImageUpload && (
                <div className="relative">
                    <ImageUpload
                        endpoint="messageImage"
                        onUploadComplete={(url) => {
                            setMediaUrl(url);
                            setShowImageUpload(false);
                        }}
                        onUploadError={(err) => setError(err)}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setShowImageUpload(false);
                            setMediaUrl('');
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Show uploaded image preview */}
            {mediaUrl && !showImageUpload && (
                <div className="relative">
                    <img loading="lazy" decoding="async" src={mediaUrl} alt="Uploaded" className="max-h-40 rounded-lg" />
                    <button
                        type="button"
                        onClick={() => setMediaUrl('')}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    >
                        <X className="w-4 h-4" />
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
                            setShowImageUpload(!showImageUpload);
                        }}
                        className={`p-2 rounded-lg transition ${showImageUpload || mediaUrl ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                        title="Subir imagen"
                    >
                        <ImageIcon className="w-5 h-5" />
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
                    disabled={isSubmitting || (!content.trim() && !mediaUrl)}
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
