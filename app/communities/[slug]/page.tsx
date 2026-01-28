"use client";

import { use, useEffect, useState, useRef } from "react";
import { MapPin, Users, ArrowLeft, Plus, Loader2, ChevronUp, ChevronDown, MessageCircle, MoreVertical, Edit, Trash, Shield } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import GlobalHeader from "@/components/GlobalHeader";
import MembersPanel from "./components/MembersPanel";
import RoleManagementPanel from "./components/RoleManagementPanel";
import EnhancedCommentInput from "./components/EnhancedCommentInput";
import ImageUpload from "@/components/ImageUpload";

type Community = {
    id: string;
    name: string;
    slug: string;
    description: string;
    iconUrl?: string;
    memberCount: number;
    postCount: number;
    category: string;
};

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

export default function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const { user } = useUser();
    const [community, setCommunity] = useState<Community | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isMember, setIsMember] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState<'posts' | 'chat' | 'members'>('posts');
    const [isMembersPanelCollapsed, setIsMembersPanelCollapsed] = useState(false);
    const [showRoleManagement, setShowRoleManagement] = useState(false);

    useEffect(() => {
        loadCommunity();
        loadPosts();
    }, [slug]);

    const loadCommunity = async () => {
        try {
            const res = await fetch(`/api/communities/${slug}`);
            const data = await res.json();
            setCommunity(data.community);
            setIsMember(data.isMember);
            setUserRole(data.userRole);
        } catch (error) {
            console.error('Error loading community:', error);
            showToast('Error al cargar la comunidad', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const loadPosts = async () => {
        try {
            const res = await fetch(`/api/communities/${slug}/posts`);
            const data = await res.json();
            setPosts(data.posts || []);
        } catch (error) {
            console.error('Error loading posts:', error);
        }
    };

    const handleJoinLeave = async () => {
        setIsJoining(true);
        try {
            const method = isMember ? 'DELETE' : 'POST';
            const res = await fetch(`/api/communities/${slug}/join`, { method });
            const data = await res.json();

            if (res.ok) {
                setIsMember(!isMember);
                setUserRole(null); // Clear role when leaving
                showToast(data.message, 'success');
                loadCommunity(); // Refresh member count
            } else {
                showToast(data.error || 'Error al procesar solicitud', 'error');
            }
        } catch (error) {
            console.error('Error joining/leaving community:', error);
            showToast('Error de conexión', 'error');
        } finally {
            setIsJoining(false);
        }
    };

    const handlePostCreated = (newPost: Post) => {
        setPosts([newPost, ...posts]);
        setShowCreateModal(false);
        loadCommunity(); // Refresh post count
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/communities/${slug}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                showToast('Comunidad eliminada correctamente', 'success');
                // Redirect after 1 second
                setTimeout(() => window.location.href = '/communities', 1000);
            } else {
                showToast(data.error || 'Error al eliminar comunidad', 'error');
            }
        } catch (error) {
            console.error('Error deleting community:', error);
            showToast('Error de conexión', 'error');
        } finally {
            setShowDeleteModal(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!community) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Comunidad no encontrada</h2>
                    <Link href="/communities" className="text-indigo-400 hover:underline">
                        Volver a comunidades
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Global Header */}
            <GlobalHeader />

            {/* Community Hero */}
            <div className="bg-white/5 border-b border-white/10">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-start gap-4">
                            {community.iconUrl ? (
                                <img src={community.iconUrl} alt={community.name} className="w-20 h-20 rounded-lg" />
                            ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Users className="w-10 h-10 text-white" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">{community.name}</h1>
                                <p className="text-gray-400 mb-3">{community.description}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span>{community.memberCount} miembros</span>
                                    <span>{community.postCount} posts</span>
                                    <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded capitalize">
                                        {community.category}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {/* Botón Gestión de Roles - Para owner y admin */}
                            {isMember && (userRole === 'owner' || userRole === 'admin') && (
                                <button
                                    onClick={() => setShowRoleManagement(true)}
                                    className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                                >
                                    <Shield className="w-5 h-5" />
                                    Gestionar Roles
                                </button>
                            )}

                            {/* Botón Crear Post - Para miembros Y owners */}
                            {isMember && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Crear Post
                                </button>
                            )}

                            {/* Botones de Owner - Solo para owners */}
                            {userRole === 'owner' && (
                                <>
                                    <button
                                        onClick={() => setShowEditModal(true)}
                                        className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                                    >
                                        Eliminar
                                    </button>
                                </>
                            )}

                            {/* Botón Unirse/Abandonar - Solo para NO-owners */}
                            {user && userRole !== 'owner' && (
                                <button
                                    onClick={handleJoinLeave}
                                    disabled={isJoining}
                                    className={`px-6 py-3 font-semibold rounded-lg transition ${isMember
                                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        } disabled:opacity-50`}
                                >
                                    {isJoining ? 'Cargando...' : isMember ? 'Abandonar' : 'Unirse'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white/5 border-b border-white/10">
                <div className="container mx-auto px-4">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`py-4 px-2 font-semibold border-b-2 transition ${activeTab === 'posts'
                                ? 'border-indigo-500 text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                        >
                            Posts
                        </button>
                        {isMember && (
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`py-4 px-2 font-semibold border-b-2 transition ${activeTab === 'chat'
                                    ? 'border-indigo-500 text-white'
                                    : 'border-transparent text-gray-400 hover:text-white'
                                    }`}
                            >
                                Chat
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab Content - LAYOUT FIJO, no se mueve cuando se abre el panel */}
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {activeTab === 'posts' && (
                    <>
                        {posts.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 rounded-xl">
                                <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-300 mb-2">
                                    No hay posts aún
                                </h3>
                                <p className="text-gray-500 mb-6">
                                    {isMember ? '¡Sé el primero en publicar!' : 'Únete para ver y crear posts'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {posts.map(post => (
                                    <PostCard key={post.id} post={post} communitySlug={slug} userRole={userRole} />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'chat' && isMember && (
                    <CommunityChat communitySlug={slug} />
                )}
            </div>

            {/* Members Panel (Lateral Derecho) */}
            {isMember && (
                <MembersPanel
                    communitySlug={slug}
                    isCollapsed={isMembersPanelCollapsed}
                    onToggle={() => setIsMembersPanelCollapsed(!isMembersPanelCollapsed)}
                />
            )}

            {/* Create Post Modal */}
            {showCreateModal && (
                <CreatePostModal
                    communitySlug={slug}
                    onClose={() => setShowCreateModal(false)}
                    onPostCreated={handlePostCreated}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-xl max-w-md w-full p-6 border border-red-500/30">
                        <h3 className="text-2xl font-bold text-white mb-4">¿Eliminar comunidad?</h3>
                        <p className="text-gray-400 mb-6">
                            Esta acción es permanente. Se eliminarán todos los posts, comentarios y miembros asociados.
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

            {/* Edit Community Modal */}
            {showEditModal && (
                <EditCommunityModal
                    community={community!}
                    onClose={() => setShowEditModal(false)}
                    onSaved={loadCommunity}
                />
            )}

            {/* Role Management Modal */}
            {showRoleManagement && (
                <RoleManagementPanel
                    communitySlug={slug}
                    currentUserRole={userRole || 'member'}
                    onClose={() => setShowRoleManagement(false)}
                />
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
                    <div className={`px-6 py-3 rounded-lg shadow-lg ${toast.type === 'success'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                        }`}>
                        {toast.message}
                    </div>
                </div>
            )}
        </div>
    );
}

function PostCard({ post, communitySlug, userRole }: { post: Post; communitySlug: string; userRole: string | null }) {
    const [voteType, setVoteType] = useState<'upvote' | 'downvote' | null>(null);
    const [upvotes, setUpvotes] = useState(post.upvotes);
    const [downvotes, setDownvotes] = useState(post.downvotes);
    const [isVoting, setIsVoting] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [commentCount, setCommentCount] = useState(post.commentCount);

    useEffect(() => {
        // Load user's current vote
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
                // Update local state based on action
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
                } else { // added
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
                    {/* Title with Options Menu */}
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="text-white font-bold text-lg hover:text-indigo-400 cursor-pointer flex-1">
                            {post.title}
                        </h3>
                        <PostOptionsMenu post={post} userRole={userRole} communitySlug={communitySlug} />
                    </div>
                    {post.content && (
                        <p className="text-gray-400 text-sm mb-3 line-clamp-3">
                            {post.content}
                        </p>
                    )}
                    {post.mediaUrl && post.contentType === 'image' && (
                        <img src={post.mediaUrl} alt="" className="rounded-lg max-h-96 object-cover mb-3" />
                    )}

                    {/* Link Embeds */}
                    {post.linkUrl && post.contentType === 'link' && (
                        <LinkEmbed url={post.linkUrl} />
                    )}

                    {/* Post Meta */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            {post.author.avatarUrl && (
                                <img src={post.author.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                            )}
                            <span>{post.author.username}</span>
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

// Post Options Menu (Edit/Delete)
function PostOptionsMenu({ post, userRole, communitySlug }: { post: Post; userRole: string | null; communitySlug: string }) {
    const { user } = useUser();
    const [showMenu, setShowMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Check if user can edit/delete (author OR owner/moderator)
    const canModify = user && (
        post.author.username === user.username ||
        userRole === 'owner' ||
        userRole === 'moderator'
    );

    if (!canModify) return null;

    const canEdit = post.author.username === user.username; // Only author can edit
    const canDelete = canModify; // Author, owner, or moderator can delete

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
                    {/* Title */}
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

                    {/* Content (only for text posts) */}
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

                    {/* Image URL (for image posts) */}
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

                    {/* Link URL (for link posts) */}
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

                    {/* Error */}
                    {error && (
                        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
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

// Link Embed Component
function LinkEmbed({ url }: { url: string }) {
    // Mover imports a la función directamente para evitar problemas
    const isYouTube = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(url);
    const isSpotify = /^(https?:\/\/)?(open\.)?spotify\.com/.test(url);

    if (isYouTube) {
        return <YouTubeEmbed url={url} />;
    }

    if (isSpotify) {
        return <SpotifyEmbed url={url} />;
    }

    // Fallback para otros links
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-white/5 border border-white/10 rounded-lg hover:border-indigo-500/50 transition mb-3"
        >
            <div className="flex items-center gap-2 text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="text-sm truncate">{url}</span>
            </div>
        </a>
    );
}

// YouTube Embed Component
function YouTubeEmbed({ url }: { url: string }) {
    const extractYouTubeId = (url: string): string | null => {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    };

    const videoId = extractYouTubeId(url);

    if (!videoId) {
        return null;
    }

    return (
        <div className="mb-3 rounded-lg overflow-hidden">
            <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video"
            />
        </div>
    );
}

// Spotify Embed Component
function SpotifyEmbed({ url }: { url: string }) {
    const extractSpotifyId = (url: string): { type: string; id: string } | null => {
        const match = url.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);

        if (match && match[1] && match[2]) {
            return {
                type: match[1],
                id: match[2],
            };
        }
        return null;
    };

    const spotifyData = extractSpotifyId(url);

    if (!spotifyData) {
        return null;
    }

    const height = spotifyData.type === 'track' ? '152' : '352';

    return (
        <div className="mb-3 rounded-lg overflow-hidden">
            <iframe
                src={`https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}`}
                width="100%"
                height={height}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                title="Spotify embed"
            />
        </div>
    );
}


// Comments List Component
function CommentsList({ comments, postId }: { comments: any[]; postId: string }) {
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
function Comment({ comment, postId, isReply = false }: { comment: any; postId: string; isReply?: boolean }) {
    const [showReplyForm, setShowReplyForm] = useState(false);

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

    return (
        <div className={isReply ? 'ml-8' : ''}>
            <div className="flex items-start gap-3">
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
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{comment.content}</p>
                    {!isReply && (
                        <button
                            onClick={() => setShowReplyForm(!showReplyForm)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                        >
                            {showReplyForm ? 'Cancelar' : 'Responder'}
                        </button>
                    )}

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
function AddCommentForm({ postId, parentCommentId, onCommentAdded, placeholder = "Escribe un comentario..." }: {
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
                // Reload page to show new comment in proper position
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

function CreatePostModal({
    communitySlug,
    onClose,
    onPostCreated
}: {
    communitySlug: string;
    onClose: () => void;
    onPostCreated: (post: Post) => void;
}) {
    const [postType, setPostType] = useState<'text' | 'image' | 'link'>('text');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        linkUrl: '',
        mediaUrl: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            setError('El título es obligatorio');
            return;
        }

        if (postType === 'link' && !formData.linkUrl.trim()) {
            setError('Debes proporcionar una URL');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/communities/${communitySlug}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    content: formData.content,
                    contentType: postType,
                    linkUrl: postType === 'link' ? formData.linkUrl : null,
                    mediaUrl: postType === 'image' ? formData.mediaUrl : null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al crear el post');
            }

            // Crear objeto post completo
            const newPost: Post = {
                ...data.post,
                author: {
                    username: 'Tú',
                    avatarUrl: undefined,
                },
            };

            onPostCreated(newPost);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-white/10 p-6 flex items-center justify-between sticky top-0 bg-gray-900">
                    <h2 className="text-2xl font-bold text-white">Crear Post</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Post Type Selector */}
                    <div>
                        <label className="block text-white font-semibold mb-3">Tipo de post</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setPostType('text')}
                                className={`flex-1 p-4 rounded-lg border-2 transition ${postType === 'text'
                                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'
                                    }`}
                            >
                                <div className="text-2xl mb-1">📝</div>
                                <div className="text-sm font-medium">Texto</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPostType('image')}
                                className={`flex-1 p-4 rounded-lg border-2 transition ${postType === 'image'
                                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'
                                    }`}
                            >
                                <div className="text-2xl mb-1">🖼️</div>
                                <div className="text-sm font-medium">Imagen</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPostType('link')}
                                className={`flex-1 p-4 rounded-lg border-2 transition ${postType === 'link'
                                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'
                                    }`}
                            >
                                <div className="text-2xl mb-1">🔗</div>
                                <div className="text-sm font-medium">Link</div>
                            </button>
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-white font-semibold mb-2">
                            Título *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Escribe un título llamativo..."
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            maxLength={300}
                        />
                        <p className="text-sm text-gray-500 mt-1">{formData.title.length}/300</p>
                    </div>

                    {/* Content (for text posts) */}
                    {postType === 'text' && (
                        <div>
                            <label className="block text-white font-semibold mb-2">
                                Contenido
                            </label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder="Escribe tu post aquí..."
                                rows={8}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                maxLength={5000}
                            />
                            <p className="text-sm text-gray-500 mt-1">{formData.content.length}/5000</p>
                        </div>
                    )}

                    {/* Image Upload (for image posts) */}
                    {postType === 'image' && (
                        <div>
                            <label className="block text-white font-semibold mb-2">
                                Subir Imagen
                            </label>
                            <ImageUpload
                                endpoint="postImage"
                                onUploadComplete={(url: string) => setFormData({ ...formData, mediaUrl: url })}
                                onUploadError={(err: string) => setError(err)}
                                maxSizeMB={4}
                            />
                            {formData.mediaUrl && (
                                <div className="mt-3 relative">
                                    <img
                                        src={formData.mediaUrl}
                                        alt="Preview"
                                        className="rounded-lg max-h-64 object-cover w-full"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, mediaUrl: '' })}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Link URL (for link posts) */}
                    {postType === 'link' && (
                        <div>
                            <label className="block text-white font-semibold mb-2">
                                URL del enlace *
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

                    {/* Error */}
                    {error && (
                        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                            {isSubmitting ? 'Publicando...' : 'Publicar'}
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

function EditCommunityModal({
    community,
    onClose,
    onSaved,
}: {
    community: Community;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [formData, setFormData] = useState({
        name: community.name,
        description: community.description,
        iconUrl: community.iconUrl || '',
        category: community.category,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const categories = [
        'gaming',
        'sports',
        'music',
        'food',
        'tech',
        'art',
        'fitness',
        'travel',
        'other'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            setError('El nombre es obligatorio');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/communities/${community.slug}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                onSaved();
                onClose();
            } else {
                setError(data.error || 'Error al actualizar comunidad');
            }
        } catch (error) {
            console.error('Error updating community:', error);
            setError('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl max-w-2xl w-full p-6 my-8">
                <h2 className="text-2xl font-bold text-white mb-6">Editar Comunidad</h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-white font-semibold mb-2">
                            Nombre de la comunidad *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Gamers de Madrid"
                            maxLength={50}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-white font-semibold mb-2">
                            Descripción
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe tu comunidad..."
                            rows={4}
                            maxLength={300}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Icon URL */}
                    <div>
                        <label className="block text-white font-semibold mb-2">
                            URL del icono
                        </label>
                        <input
                            type="url"
                            value={formData.iconUrl}
                            onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                            placeholder="https://ejemplo.com/icon.png"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {formData.iconUrl && (
                            <div className="mt-3">
                                <img
                                    src={formData.iconUrl}
                                    alt="Preview"
                                    className="w-20 h-20 rounded-lg object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-white font-semibold mb-2">
                            Categoría *
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat} className="bg-gray-800">
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
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

function CommunityChat({ communitySlug }: { communitySlug: string }) {
    const [messages, setMessages] = useState<
        Array<{
            id: string;
            content: string;
            createdAt: string;
            author: { username: string; avatarUrl?: string };
        }>
    >([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
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

        if (!newMessage.trim() || isSending) return;

        setIsSending(true);

        try {
            const res = await fetch(`/api/communities/${communitySlug}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newMessage }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages([...messages, data.message]);
                setNewMessage('');
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
                        <div key={msg.id} className="flex items-start gap-3">
                            {msg.author.avatarUrl ? (
                                <img
                                    src={msg.author.avatarUrl}
                                    alt={msg.author.username}
                                    className="w-10 h-10 rounded-full"
                                />
                            ) : (
                                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {msg.author.username[0].toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="font-semibold text-white">
                                        {msg.author.username}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {formatTime(msg.createdAt!)}
                                    </span>
                                </div>
                                <p className="text-gray-300">{msg.content}</p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="border-t border-white/10 p-4">
                <div className="flex gap-3">
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
                        disabled={!newMessage.trim() || isSending}
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
