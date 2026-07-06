"use client";

import { useState, useEffect } from "react";
import { UserPlus, X, Loader2, Check } from "lucide-react";

type FriendRequest = {
    id: string;
    sender: {
        id: string;
        username: string;
        avatarUrl?: string;
    };
    createdAt: Date;
};

export default function FriendRequestsModal({ onClose }: { onClose: () => void }) {
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const res = await fetch('/api/friends/requests');
            const data = await res.json();
            setRequests(data.requests || []);
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async (requestId: string) => {
        try {
            const res = await fetch(`/api/friends/requests/${requestId}/accept`, {
                method: 'PUT',
            });
            if (res.ok) {
                await loadRequests();
            }
        } catch (error) {
            console.error('Error accepting request:', error);
        }
    };

    const handleReject = async (requestId: string) => {
        try {
            const res = await fetch(`/api/friends/requests/${requestId}/reject`, {
                method: 'PUT',
            });
            if (res.ok) {
                await loadRequests();
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl border border-white/10 max-w-md w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-xl font-bold text-white">
                            Solicitudes de Amistad
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-8">
                            <UserPlus className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500">
                                No tienes solicitudes pendientes
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {requests.map((request) => (
                                <div
                                    key={request.id}
                                    className="bg-gray-800/50 rounded-lg p-4 border border-white/5"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        {request.sender.avatarUrl ? (
                                            <img loading="lazy" decoding="async"
                                                src={request.sender.avatarUrl}
                                                alt={request.sender.username}
                                                className="w-12 h-12 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                {request.sender.username[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-white font-semibold">
                                                {request.sender.username}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(request.createdAt).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAccept(request.id)}
                                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 font-semibold"
                                        >
                                            <Check className="w-4 h-4" />
                                            Aceptar
                                        </button>
                                        <button
                                            onClick={() => handleReject(request.id)}
                                            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-semibold"
                                        >
                                            Rechazar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
