"use client";

import { use, useEffect, useState, useCallback } from "react";
import { Users, Plus, Loader2, MessageCircle, Shield } from "lucide-react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import GlobalHeader from "@/components/GlobalHeader";
import MembersPanel from "./components/MembersPanel";
import dynamic from "next/dynamic";
const RoleManagementPanel = dynamic(() => import("./components/RoleManagementPanel"), { ssr: false });
import CommunityChat from "./components/CommunityChat";
import PostCard from "./components/PostCard";
const CreatePostModal = dynamic(() => import("./components/CreatePostModal"), { ssr: false });
const EditCommunityModal = dynamic(() => import("./components/EditCommunityModal"), { ssr: false });

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

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const loadCommunity = useCallback(async () => {
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
    }, [slug, showToast]);

    const loadPosts = useCallback(async () => {
        try {
            const res = await fetch(`/api/communities/${slug}/posts`);
            const data = await res.json();
            setPosts(data.posts || []);
        } catch (error) {
            console.error('Error loading posts:', error);
        }
    }, [slug]);

    useEffect(() => {
        loadCommunity();
        loadPosts();
    }, [loadCommunity, loadPosts]);

    const handleJoinLeave = async () => {
        setIsJoining(true);
        try {
            const method = isMember ? 'DELETE' : 'POST';
            const res = await fetch(`/api/communities/${slug}/join`, { method });
            const data = await res.json();

            if (res.ok) {
                setIsMember(!isMember);
                setUserRole(null);
                showToast(data.message, 'success');
                loadCommunity();
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
        loadCommunity();
    };

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/communities/${slug}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                showToast('Comunidad eliminada correctamente', 'success');
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
            <GlobalHeader />

            {/* Community Hero */}
            <div className="bg-white/5 border-b border-white/10">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div className="flex items-start gap-4">
                            {community.iconUrl ? (
                                <img loading="lazy" decoding="async" src={community.iconUrl} alt={community.name} className="w-20 h-20 rounded-lg" />
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

                        <div className="flex gap-3 flex-wrap">
                            {isMember && (userRole === 'owner' || userRole === 'admin') && (
                                <button
                                    onClick={() => setShowRoleManagement(true)}
                                    className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                                >
                                    <Shield className="w-5 h-5" />
                                    Gestionar Roles
                                </button>
                            )}

                            {isMember && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Crear Post
                                </button>
                            )}

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

            {/* Tab Content */}
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

            {/* Members Panel */}
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
