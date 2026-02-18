"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";

// Comments List Component
export function CommentsList({ comments, postId }: { comments: any[]; postId: string }) {
    if (comments.length === 0) {
        return (
            <p className="text-gray-500 text-sm py-4">No hay comentarios aún. ¡Sé el primero!</p>
        );
    }

    return (
        <div className="space-y-4 mb-4">
            {comments.map((comment) => (
                <Comment key={comment.id} comment={comment} postId={postId} />
            ))}
        </div>
    );
}

// Single Comment Component
export function Comment({ comment, postId, isReply = false }: { comment: any; postId: string; isReply?: boolean }) {
    const { user } = useUser();
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'ahora';
        if (diffMins < 60) return `hace ${diffMins}min`;
        if (diffHours < 24) return `hace ${diffHours}h`;
        if (diffDays < 7) return `hace ${diffDays}d`;
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/posts/${postId}/comments/${comment.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    // Si el comentario está eliminado
    if (comment.deletedAt) {
        return (
            <div className={isReply ? 'ml-8' : ''}>
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-gray-500 mt-1">
                        <Trash2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold text-gray-500 text-sm">
                                {comment.author?.username || 'Usuario'}
                            </span>
                            <span className="text-xs text-gray-600">
                                {formatTime(comment.createdAt)}
                            </span>
                        </div>
                        <p className="text-gray-500 italic text-sm">[comentario eliminado]</p>
                    </div>
                </div>
            </div>
        );
    }

    // Verificar permisos
    const canDelete = true; // TODO: verificar si es autor o tiene permisos de mod

    return (
        <div className={isReply ? 'ml-8' : ''}>
            <div
                className="flex items-start gap-3 group relative"
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
            >
                {comment.author?.avatarUrl ? (
                    <img
                        src={comment.author.avatarUrl}
                        alt={comment.author.username}
                        className="w-8 h-8 rounded-full mt-1"
                    />
                ) : (
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm mt-1">
                        {comment.author?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                )}
                <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-white text-sm">
                            {comment.author?.username || 'Usuario'}
                        </span>
                        <span className="text-xs text-gray-500">
                            {formatTime(comment.createdAt)}
                        </span>
                        {showActions && (
                            <>
                                {!isReply && (
                                    <button
                                        onClick={() => setShowReplyForm(!showReplyForm)}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                                    >
                                        {showReplyForm ? 'Cancelar' : 'Responder'}
                                    </button>
                                )}
                                {canDelete && (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Eliminar
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Confirmación de eliminación */}
                    {showDeleteConfirm && (
                        <div className="absolute top-0 right-0 bg-gray-800 border border-red-500 rounded-lg p-3 shadow-xl z-10">
                            <p className="text-sm text-white mb-2">¿Eliminar comentario?</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        await handleDelete();
                                        setShowDeleteConfirm(false);
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition"
                                >
                                    Eliminar
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    <p className="text-gray-300 text-sm mb-2">{comment.content}</p>

                    {/* Reply Form */}
                    {showReplyForm && (
                        <div className="mt-2">
                            <AddCommentForm
                                postId={postId}
                                parentCommentId={comment.id}
                                onCommentAdded={() => setShowReplyForm(false)}
                                placeholder="Escribe una respuesta..."
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 space-y-3">
                    {comment.replies.map((reply: any) => (
                        <Comment key={reply.id} comment={reply} postId={postId} isReply={true} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Add Comment Form Component
export function AddCommentForm({ postId, parentCommentId, onCommentAdded, placeholder = "Escribe un comentario..." }: {
    postId: string;
    parentCommentId?: string;
    onCommentAdded?: (comment: any) => void;
    placeholder?: string;
}) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim() || isSubmitting) return;

        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    parentCommentId: parentCommentId || null,
                }),
            });

            const data = await res.json();

            if (res.ok && data.comment) {
                setContent('');
                if (onCommentAdded) {
                    onCommentAdded(data.comment);
                }
                window.location.reload();
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? 'Enviando...' : 'Enviar'}
            </button>
        </form>
    );
}
