"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, MessageCircle, Loader2, MoreVertical, Edit, Trash } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { LinkEmbed } from "./LinkEmbeds";
import { CommentsList } from "./Comments";
import EnhancedCommentInput from "./EnhancedCommentInput";

type Post = {
    id: string;
    title: string;
    content: string;
    contentType: string;
    mediaUrl?: string;
    linkUrl?: string;
    upvotes: number;
    downvotes: number;
    commentCount: number;
    createdAt: string;
    userId: string;
    author: {
        username: string;
        avatarUrl?: string;
    };
};

// Post Options Menu (Edit/Delete)
function PostOptionsMenu({ post, userRole, communitySlug }: { post: Post; userRole: string | null; communitySlug: string }) {
    const { user } = useUser();
    const [showMenu, setShowMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const canModify = user && (
        post.author.username === user.username ||
        userRole === 'owner' ||
        userRole === 'moderator'
    );

    if (!canModify) return null;

    const canEdit = post.author.username === user.username;
    const canDelete = canModify;

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/posts/${post.id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                window.location.reload();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al eliminar post');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Error al eliminar post');
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition"
            >
                <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
                <>
                    <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-8 bg-gray-800 border border-white/10 rounded-lg shadow-lg py-1 z-10 w-40">
                        {canEdit && (
                            <button
                                onClick={() => {
                                    setShowMenu(false);
                                    setShowEditModal(true);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition flex items-center gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Editar
                            </button>
                        )}
                        {canDelete && (
                            <button
                                onClick={() => {
                                    setShowMenu(false);
                                    setShowDeleteModal(true);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition flex items-center gap-2"
                            >
                                <Trash className="w-4 h-4" />
                                Eliminar
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <EditPostModal
                    post={post}
                    onClose={() => setShowEditModal(false)}
                    onSaved={() => {
                        setShowEditModal(false);
                        window.location.reload();
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full p-6 border border-red-500/30">
                        <h3 className="text-2xl font-bold text-white mb-4">¿Eliminar post?</h3>
                        <p className="text-gray-400 mb-6">
                            Esta acción no se puede deshacer. Se eliminarán todos los comentarios y votos asociados.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Edit Post Modal
function EditPostModal({ post, onClose, onSaved }: { post: Post; onClose: () => void; onSaved: () => void }) {
    const [formData, setFormData] = useState({
        title: post.title,
        content: post.content || '',
        mediaUrl: post.mediaUrl || '',
        linkUrl: post.linkUrl || '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.title.trim()) {
            setError('El título es obligatorio');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/posts/${post.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                onSaved();
            } else {
                setError(data.error || 'Error al actualizar post');
            }
        } catch (error) {
            console.error('Error updating post:', error);
            setError('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl max-w-2xl w-full p-6 my-8">
                <h2 className="text-2xl font-bold text-white mb-6">Editar Post</h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-white font-semibold mb-2">
                            Título *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Título del post"
                            maxLength={300}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {post.contentType === 'text' && (
                        <div>
                            <label className="block text-white font-semibold mb-2">
                                Contenido
                            </label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder="Escribe tu contenido aquí..."
                                rows={6}
                                maxLength={5000}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {post.contentType === 'image' && (
                        <div>
                            <label className="block text-white font-semibold mb-2">
                                URL de la imagen
                            </label>
                            <input
                                type="url"
                                value={formData.mediaUrl}
                                onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                                placeholder="https://ejemplo.com/imagen.jpg"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {post.contentType === 'link' && (
                        <div>
                            <label className="block text-white font-semibold mb-2">
                                URL del enlace
                            </label>
                            <input
                                type="url"
                                value={formData.linkUrl}
                                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                                placeholder="https://ejemplo.com"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Main PostCard Component
export default function PostCard({ post, communitySlug, userRole }: { post: Post; communitySlug: string; userRole: string | null }) {
    const [voteType, setVoteType] = useState<'upvote' | 'downvote' | null>(null);
    const [upvotes, setUpvotes] = useState(post.upvotes);
    const [downvotes, setDownvotes] = useState(post.downvotes);
    const [isVoting, setIsVoting] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [commentCount, setCommentCount] = useState(post.commentCount);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        fetch(`/api/posts/${post.id}/vote`)
            .then(res => res.json())
            .then(data => setVoteType(data.voteType))
            .catch(console.error);
    }, [post.id]);

    const handleVote = async (type: 'upvote' | 'downvote') => {
        if (isVoting) return;
        setIsVoting(true);

        try {
            const res = await fetch(`/api/posts/${post.id}/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voteType: type }),
            });

            const data = await res.json();

            if (data.success) {
                if (data.action === 'removed') {
                    setVoteType(null);
                    if (type === 'upvote') setUpvotes(upvotes - 1);
                    else setDownvotes(downvotes - 1);
                } else if (data.action === 'changed') {
                    setVoteType(type);
                    if (type === 'upvote') {
                        setUpvotes(upvotes + 1);
                        setDownvotes(downvotes - 1);
                    } else {
                        setDownvotes(downvotes + 1);
                        setUpvotes(upvotes - 1);
                    }
                } else {
                    setVoteType(type);
                    if (type === 'upvote') setUpvotes(upvotes + 1);
                    else setDownvotes(downvotes + 1);
                }
            }
        } catch (error) {
            console.error('Error voting:', error);
        } finally {
            setIsVoting(false);
        }
    };

    const loadComments = async () => {
        setIsLoadingComments(true);
        try {
            const res = await fetch(`/api/posts/${post.id}/comments`);
            const data = await res.json();
            setComments(data.comments || []);
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setIsLoadingComments(false);
        }
    };

    const handleToggleComments = () => {
        if (!showComments) {
            loadComments();
        }
        setShowComments(!showComments);
    };

    const handleCommentAdded = (newComment: any) => {
        setComments([...comments, newComment]);
        setCommentCount(commentCount + 1);
    };

    const score = upvotes - downvotes;

    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-indigo-500/50 transition p-4">
            <div className="flex gap-4">
                {/* Vote Buttons */}
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={() => handleVote('upvote')}
                        disabled={isVoting}
                        className={`p-2 rounded transition ${voteType === 'upvote'
                            ? 'text-indigo-400 bg-indigo-500/20'
                            : 'text-gray-500 hover:text-indigo-400 hover:bg-white/5'
                            }`}
                    >
                        <ChevronUp className="w-6 h-6" />
                    </button>
                    <span className={`font-bold text-lg ${score > 0 ? 'text-indigo-400' : score < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                        {score}
                    </span>
                    <button
                        onClick={() => handleVote('downvote')}
                        disabled={isVoting}
                        className={`p-2 rounded transition ${voteType === 'downvote'
                            ? 'text-red-400 bg-red-500/20'
                            : 'text-gray-500 hover:text-red-400 hover:bg-white/5'
                            }`}
                    >
                        <ChevronDown className="w-6 h-6" />
                    </button>
                </div>

                {/* Post Content */}
                <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="text-white font-bold text-lg hover:text-indigo-400 cursor-pointer flex-1">
                            {post.title}
                        </h3>
                        <PostOptionsMenu post={post} userRole={userRole} communitySlug={communitySlug} />
                    </div>
                    {post.content && (
                        <div>
                            <p className={`text-gray-400 text-sm mb-2 whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
                                {post.content}
                            </p>
                            {post.content.length > 200 && (
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="text-indigo-400 text-xs hover:text-indigo-300 font-medium mb-3 hover:underline"
                                >
                                    {isExpanded ? 'Leer menos' : 'Leer más'}
                                </button>
                            )}
                            {!isExpanded && post.content.length <= 200 && <div className="mb-3"></div>}
                        </div>
                    )}
                    {post.mediaUrl && post.contentType === 'image' && (
                        <img src={post.mediaUrl} alt="" className="rounded-lg max-h-96 object-cover mb-3" />
                    )}

                    {post.linkUrl && post.contentType === 'link' && (
                        <LinkEmbed url={post.linkUrl} />
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            {post.author.avatarUrl && (
                                <img src={post.author.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                            )}
                            <Link href={`/users/${post.author.username}`} className="hover:text-indigo-400 hover:underline transition">
                                {post.author.username}
                            </Link>
                        </div>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                        <span>•</span>
                        <button
                            onClick={handleToggleComments}
                            className="flex items-center gap-1 hover:text-indigo-400 transition"
                        >
                            <MessageCircle className="w-4 h-4" />
                            {commentCount} {showComments ? '▲' : '▼'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    {isLoadingComments ? (
                        <div className="text-center py-4">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <CommentsList comments={comments} postId={post.id} />
                            <EnhancedCommentInput
                                postId={post.id}
                                onCommentAdded={handleCommentAdded}
                                placeholder="Escribe un comentario..."
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
