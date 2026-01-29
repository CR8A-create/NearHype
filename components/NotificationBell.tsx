"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import Link from "next/link";

type Notification = {
    id: string;
    type: string;
    title: string;
    message: string;
    linkUrl: string | null;
    isRead: boolean;
    createdAt: string;
    metadata?: {
        fromUsername?: string;
        fromAvatarUrl?: string;
    };
};

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [prevUnreadCount, setPrevUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cargar notificaciones
    const loadNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (!res.ok) {
                console.warn('Notifications API not available yet');
                return;
            }

            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            console.warn('Notifications feature not ready yet:', error);
            // Silenciar el error para no romper la UI
        }
    };

    // Polling cada 30 segundos
    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // Detectar nueva notificación y reproducir sonido
    useEffect(() => {
        if (unreadCount > prevUnreadCount) {
            playNotificationSound();
        }
        setPrevUnreadCount(unreadCount);
    }, [unreadCount]);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    // Marcar como leída
    const markAsRead = async (notificationId: string) => {
        try {
            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
            });

            // Actualizar localmente
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    // Marcar todas como leídas
    const markAllAsRead = async () => {
        setIsLoading(true);
        try {
            await fetch('/api/notifications/mark-all-read', {
                method: 'PUT',
            });

            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Sonido personalizado único con Web Audio API
    const playNotificationSound = () => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Frecuencias para un sonido distintivo (acorde mayor con brillo)
            const frequencies = [587.33, 739.99, 987.77]; // D5, F#5, B5
            const duration = 0.15; // Duración corta y rápida
            const now = audioContext.currentTime;

            frequencies.forEach((freq, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                // Onda sinusoidal para sonido limpio
                oscillator.type = 'sine';
                oscillator.frequency.value = freq;

                // Envelope rápido (ataque rápido, decay rápido)
                gainNode.gain.setValueAtTime(0, now + index * 0.05);
                gainNode.gain.linearRampToValueAtTime(0.15, now + index * 0.05 + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.05 + duration);

                oscillator.start(now + index * 0.05);
                oscillator.stop(now + index * 0.05 + duration);
            });
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    };

    // Formatear timestamp
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'ahora';
        if (diffMins < 60) return `hace ${diffMins} min`;
        if (diffMins < 1440) return `hace ${Math.floor(diffMins / 60)} h`;
        return `hace ${Math.floor(diffMins / 1440)} días`;
    };

    // Icono según tipo
    const getIcon = (type: string) => {
        // Podemos expandir esto con más iconos personalizados
        return <Bell className="w-4 h-4" />;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Botón de campana */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition"
                title="Notificaciones"
            >
                <Bell className="w-6 h-6" />

                {/* Badge con contador */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-96 bg-gray-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Notificaciones</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                disabled={isLoading}
                                className="text-sm text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
                            >
                                <CheckCheck className="w-4 h-4" />
                                Marcar todas
                            </button>
                        )}
                    </div>

                    {/* Lista de notificaciones */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">No tienes notificaciones</p>
                            </div>
                        ) : (
                            notifications.map((notif) => {
                                const content = (
                                    <div
                                        className={`p-4 border-b border-white/5 hover:bg-white/5 transition cursor-pointer ${!notif.isRead ? 'bg-indigo-900/20' : ''
                                            }`}
                                        onClick={() => {
                                            if (!notif.isRead) {
                                                markAsRead(notif.id);
                                            }
                                            setShowDropdown(false);
                                        }}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Avatar o icono */}
                                            {notif.metadata?.fromAvatarUrl ? (
                                                <img
                                                    src={notif.metadata.fromAvatarUrl}
                                                    alt={notif.metadata.fromUsername}
                                                    className="w-10 h-10 rounded-full"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                                                    {getIcon(notif.type)}
                                                </div>
                                            )}

                                            {/* Contenido */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white mb-1">
                                                    {notif.title}
                                                </p>
                                                <p className="text-sm text-gray-400 line-clamp-2 mb-2">
                                                    {notif.message}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">
                                                        {formatTime(notif.createdAt)}
                                                    </span>
                                                    {!notif.isRead && (
                                                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );

                                return notif.linkUrl ? (
                                    <Link key={notif.id} href={notif.linkUrl}>
                                        {content}
                                    </Link>
                                ) : (
                                    <div key={notif.id}>{content}</div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
