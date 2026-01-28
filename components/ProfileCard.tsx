"use client";

import { useState, useRef, MouseEvent, TouchEvent } from "react";
import { MapPin, Heart, X } from "lucide-react";

type Profile = {
    id: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
    publicInterests?: string[];
    location?: {
        city: string;
        distance: number;
    };
    matchScore: number;
};

type ProfileCardProps = {
    profile: Profile;
    onSwipe: (direction: 'like' | 'skip') => void;
    isTop: boolean;
};

export default function ProfileCard({ profile, onSwipe, isTop }: ProfileCardProps) {
    const [exitX, setExitX] = useState(0);
    const [exitY, setExitY] = useState(0);
    const cardRef = useRef<HTMLDivElement>(null);
    const [startX, setStartX] = useState(0);
    const [deltaX, setDeltaX] = useState(0);

    // Touch/Mouse handlers
    const handleDragStart = (clientX: number) => {
        setStartX(clientX);
    };

    const handleDragMove = (clientX: number) => {
        if (startX === 0) return;
        const delta = clientX - startX;
        setDeltaX(delta);
    };

    const handleDragEnd = () => {
        if (Math.abs(deltaX) > 100) {
            const direction = deltaX > 0 ? 'like' : 'skip';
            setExitX(deltaX > 0 ? 1000 : -1000);
            setExitY(50);
            setTimeout(() => onSwipe(direction), 200);
        } else {
            setDeltaX(0);
        }
        setStartX(0);
    };

    // Mouse events
    const handleMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        handleDragStart(e.clientX);
    };

    const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        handleDragMove(e.clientX);
    };

    const handleMouseUp = () => {
        handleDragEnd();
    };

    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
        handleDragStart(e.touches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
        handleDragMove(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
        handleDragEnd();
    };

    const rotation = deltaX * 0.1;
    const opacity = Math.max(0.3, 1 - Math.abs(deltaX) / 200);

    const cardStyle = {
        transform: exitX !== 0
            ? `translateX(${exitX}px) translateY(${exitY}px) rotate(${rotation}deg)`
            : `translateX(${deltaX}px) rotate(${rotation}deg)`,
        opacity: exitX !== 0 ? 0 : opacity,
        transition: exitX !== 0 ? 'all 0.3s ease-out' : deltaX === 0 ? 'transform 0.3s ease-out' : 'none',
        zIndex: isTop ? 10 : 5,
        pointerEvents: isTop ? 'auto' : 'none' as const,
    };

    return (
        <div
            ref={cardRef}
            className="absolute top-0 left-0 w-full h-full select-none cursor-grab active:cursor-grabbing"
            style={cardStyle}
            onMouseDown={handleMouseDown}
            onMouseMove={deltaX !== 0 ? handleMouseMove : undefined}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className="bg-gray-800 rounded-2xl shadow-2xl h-full overflow-hidden border-2 border-white/10">
                {/* Avatar/Banner */}
                <div className="h-64 bg-gradient-to-br from-indigo-600 to-purple-600 relative overflow-hidden">
                    {profile.avatarUrl ? (
                        <img
                            src={profile.avatarUrl}
                            alt={profile.username}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-9xl font-bold">
                            {profile.username[0].toUpperCase()}
                        </div>
                    )}

                    {/* Match score badge */}
                    {profile.matchScore > 0 && (
                        <div className="absolute top-4 right-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                            {profile.matchScore}% Match
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="mb-4">
                        <h2 className="text-3xl font-bold text-white mb-2">{profile.username}</h2>
                        {profile.location && (
                            <p className="text-gray-400 flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {profile.location.city} • {profile.location.distance} km
                            </p>
                        )}
                    </div>

                    {profile.bio && (
                        <p className="text-gray-300 mb-4 line-clamp-3">{profile.bio}</p>
                    )}

                    {profile.publicInterests && profile.publicInterests.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {profile.publicInterests.slice(0, 5).map((interest, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-sm"
                                >
                                    {interest}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Swipe indicators */}
                {deltaX > 50 && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="bg-green-500 text-white px-8 py-4 rounded-full text-2xl font-bold rotate-12 border-4 border-white">
                            LIKE
                        </div>
                    </div>
                )}
                {deltaX < -50 && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="bg-red-500 text-white px-8 py-4 rounded-full text-2xl font-bold -rotate-12 border-4 border-white">
                            NOPE
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
