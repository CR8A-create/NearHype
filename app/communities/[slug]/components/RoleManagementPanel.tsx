"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, Crown, Wrench, User, X, Loader2 } from "lucide-react";

type Member = {
    id: string;
    userId: string;
    role: string;
    username: string;
    avatarUrl?: string;
};

type RoleManagementPanelProps = {
    communitySlug: string;
    currentUserRole: string;
    onClose: () => void;
};

export default function RoleManagementPanel({ communitySlug, currentUserRole, onClose }: RoleManagementPanelProps) {
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const loadMembers = useCallback(async () => {
        try {
            const res = await fetch(`/api/communities/${communitySlug}/members`);
            const data = await res.json();
            setMembers(data.members || []);
        } catch (error) {
            console.error("Error loading members:", error);
        } finally {
            setIsLoading(false);
        }
    }, [communitySlug]);

    useEffect(() => {
        loadMembers();
    }, [loadMembers]);

    const handleRoleChange = async (member: Member, newRole: string) => {
        setIsUpdating(member.id);
        try {
            const res = await fetch(`/api/communities/${communitySlug}/members/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: member.userId, newRole }),
            });

            const data = await res.json();

            if (res.ok) {
                showToast(data.message, 'success');
                loadMembers(); // Reload members list
            } else {
                showToast(data.error || 'Error al actualizar rol', 'error');
            }
        } catch (error) {
            console.error("Error updating role:", error);
            showToast('Error de conexión', 'error');
        } finally {
            setIsUpdating(null);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const canModifyRole = (targetRole: string) => {
        // Owner can modify everyone except themselves
        if (currentUserRole === 'owner') return true;

        // Admin can only modify moderators and members
        if (currentUserRole === 'admin') {
            return targetRole !== 'owner' && targetRole !== 'admin';
        }

        return false;
    };

    const getRoleButtons = (member: Member) => {
        if (member.role === 'owner') return null;
        if (!canModifyRole(member.role)) return null;
        if (isUpdating === member.id) {
            return <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />;
        }

        const roles = [
            { value: 'member', label: 'Miembro', icon: User, color: 'gray' },
            { value: 'moderator', label: 'Moderador', icon: Wrench, color: 'blue' },
            { value: 'admin', label: 'Admin', icon: Shield, color: 'red' },
        ];

        return (
            <div className="flex gap-2 mt-2">
                {roles.map((role) => {
                    // Admin no puede promover a admin
                    if (currentUserRole === 'admin' && role.value === 'admin') return null;

                    const isActive = member.role === role.value;
                    const Icon = role.icon;

                    return (
                        <button
                            key={role.value}
                            onClick={() => handleRoleChange(member, role.value)}
                            disabled={isActive}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${isActive
                                    ? `bg-${role.color}-500/30 text-${role.color}-300 cursor-default`
                                    : `bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white`
                                } disabled:opacity-50`}
                        >
                            <Icon className="w-4 h-4" />
                            {role.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-indigo-400" />
                        <h2 className="text-2xl font-bold text-white">Gestión de Roles</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Info */}
                <div className="px-6 py-4 bg-indigo-500/10 border-b border-white/10">
                    <p className="text-sm text-gray-300">
                        Como <span className="font-bold text-indigo-400">{currentUserRole === 'owner' ? 'Owner' : 'Admin'}</span>,
                        {currentUserRole === 'owner'
                            ? ' puedes gestionar todos los roles excepto el tuyo.'
                            : ' puedes promover/degradar moderadores y miembros, pero no admins.'
                        }
                    </p>
                </div>

                {/* Members List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
                            <p className="text-gray-400">Cargando miembros...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        {member.avatarUrl ? (
                                            <img
                                                src={member.avatarUrl}
                                                alt={member.username}
                                                className="w-12 h-12 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                                {member.username[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="text-white font-semibold">{member.username}</div>
                                            <div className="text-sm text-gray-400">
                                                Rol actual: <span className="capitalize font-medium">{member.role}</span>
                                            </div>
                                        </div>
                                        {member.role === 'owner' && <Crown className="w-6 h-6 text-yellow-400" />}
                                    </div>
                                    {getRoleButtons(member)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-4 right-4 z-[60] animate-slide-up">
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
