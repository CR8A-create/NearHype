"use client";

import { useEffect, useState } from "react";
import { Users, ChevronRight, ChevronLeft, Shield, Crown, Wrench } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import AddFriendButton from "@/components/AddFriendButton";

type Member = {
    id: string;
    userId: string;
    role: string;
    username: string;
    avatarUrl?: string;
    joinedAt: string;
};

type MembersPanelProps = {
    communitySlug: string;
    isCollapsed: boolean;
    onToggle: () => void;
};

export default function MembersPanel({ communitySlug, isCollapsed, onToggle }: MembersPanelProps) {
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, memberUsername: string } | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useUser();

    useEffect(() => {
        loadMembers();
        const handleClickOutside = () => setContextMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, memberUsername: string) => {
        e.preventDefault();
        // Don't show for self
        if (user?.username === memberUsername) return;

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            memberUsername
        });
    };

    const loadMembers = async () => {
        try {
            const res = await fetch(`/api/communities/${communitySlug}/members`);
            const data = await res.json();
            setMembers(data.members || []);
        } catch (error) {
            console.error("Error loading members:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'owner':
                return (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded text-xs">
                        <Crown className="w-3 h-3" />
                        <span>OWNER</span>
                    </div>
                );
            case 'admin':
                return (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs">
                        <Shield className="w-3 h-3" />
                        <span>ADMIN</span>
                    </div>
                );
            case 'moderator':
                return (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                        <Wrench className="w-3 h-3" />
                        <span>MOD</span>
                    </div>
                );
            default:
                return null;
        }
    };

    if (isCollapsed) {
        return (
            <div className="fixed right-0 top-20 z-40">
                <button
                    onClick={onToggle}
                    className="bg-gray-800/90 backdrop-blur-sm border-l border-y border-white/10 px-2 py-4 rounded-l-lg hover:bg-gray-700/90 transition"
                    title="Mostrar miembros"
                >
                    <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
            </div>
        );
    }

    return (
        <div className="fixed right-0 top-20 bottom-0 w-80 bg-gray-900/95 backdrop-blur-lg border-l border-white/10 z-40 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gray-900 border-b border-white/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-white">
                        Miembros ({members.length})
                    </h3>
                </div>
                <button
                    onClick={onToggle}
                    className="p-1 hover:bg-white/10 rounded transition"
                    title="Ocultar panel"
                >
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            {/* Members List */}
            <div className="p-4 space-y-2">
                {isLoading ? (
                    <div className="text-center text-gray-500 py-8">
                        Cargando miembros...
                    </div>
                ) : members.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        No hay miembros
                    </div>
                ) : (
                    members.map((member) => (
                        <div
                            key={member.id}
                            className="p-2 rounded-lg hover:bg-white/5 transition cursor-context-menu"
                            onContextMenu={(e) => handleContextMenu(e, member.username)}
                        >
                            <div className="flex items-center gap-3">
                                <Link href={`/users/${member.username}`}>
                                    {member.avatarUrl ? (
                                        <img
                                            src={member.avatarUrl}
                                            alt={member.username}
                                            className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-80 transition">
                                            {member.username[0].toUpperCase()}
                                        </div>
                                    )}
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link href={`/users/${member.username}`}>
                                        <div className="text-white font-medium truncate hover:text-indigo-400 transition cursor-pointer">
                                            {member.username}
                                        </div>
                                    </Link>
                                    {getRoleBadge(member.role)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-gray-800 border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <div className="py-1">
                        <AddFriendButton
                            username={contextMenu.memberUsername}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition flex items-center gap-3 cursor-pointer rounded-none bg-transparent hover:bg-opacity-10"
                            minimal={true} // Need to update AddFriendButton to accept this or custom class
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
