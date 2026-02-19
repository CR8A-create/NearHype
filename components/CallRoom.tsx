"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, Monitor,
    MonitorOff, Loader2, Phone
} from "lucide-react";

type CallRoomProps = {
    roomId: string;
};

const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
];

export default function CallRoom({ roomId }: CallRoomProps) {
    const router = useRouter();
    const [status, setStatus] = useState<"loading" | "connecting" | "connected" | "ended">("loading");
    const [isCaller, setIsCaller] = useState(false);
    const [otherUser, setOtherUser] = useState<{ id: string; username: string; avatarUrl?: string } | null>(null);
    const [callType, setCallType] = useState<"video" | "audio">("video");
    const [currentUserId, setCurrentUserId] = useState("");

    // Media states
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasInitiatedRef = useRef(false);

    // Load room info + initialize
    useEffect(() => {
        initCall();
        return () => {
            cleanup();
        };
    }, [roomId]);

    const cleanup = useCallback(() => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (durationRef.current) clearInterval(durationRef.current);
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
        }
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }
    }, []);

    const initCall = async () => {
        try {
            // 1. Get room info
            const res = await fetch(`/api/calls/${roomId}`);
            if (!res.ok) {
                setStatus("ended");
                return;
            }
            const data = await res.json();

            setOtherUser(data.otherUser);
            setIsCaller(data.isCaller);
            setCurrentUserId(data.currentUserId);
            setCallType(data.room.callType);

            if (data.room.status === "ended" || data.room.status === "rejected" || data.room.status === "missed") {
                setStatus("ended");
                return;
            }

            // 2. Get local media
            setStatus("connecting");
            const stream = await navigator.mediaDevices.getUserMedia({
                video: data.room.callType === "video",
                audio: true,
            });
            localStreamRef.current = stream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // 3. If callee, accept the call
            if (!data.isCaller) {
                await fetch(`/api/calls/${roomId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "join" }),
                });
            }

            // 4. Create peer connection
            createPeerConnection(stream, data.isCaller, data.currentUserId);

            // 5. Start polling for signals
            startSignalPolling();

        } catch (error) {
            console.error("Error initializing call:", error);
            setStatus("ended");
        }
    };

    const createPeerConnection = (stream: MediaStream, amICaller: boolean, myUserId: string) => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peerConnectionRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
        });

        // Handle remote tracks
        pc.ontrack = (event) => {
            if (remoteVideoRef.current && event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
            setStatus("connected");
            // Start duration timer
            durationRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        };

        // Handle ICE candidates
        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await sendSignal("ice-candidate", event.candidate.toJSON());
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
                endCall();
            }
        };

        // If caller, create offer immediately
        if (amICaller && !hasInitiatedRef.current) {
            hasInitiatedRef.current = true;
            setTimeout(() => createOffer(pc), 1000); // Small delay for callee to join
        }
    };

    const createOffer = async (pc: RTCPeerConnection) => {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignal("offer", offer);
        } catch (error) {
            console.error("Error creating offer:", error);
        }
    };

    const sendSignal = async (signalType: string, signalData: unknown) => {
        try {
            await fetch(`/api/calls/${roomId}/signal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signalType, signalData }),
            });
        } catch (error) {
            console.error("Error sending signal:", error);
        }
    };

    const startSignalPolling = () => {
        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/calls/${roomId}/signal`);
                const data = await res.json();

                for (const signal of data.signals || []) {
                    await handleSignal(signal);
                }

                // Also check if room is still active
                const roomRes = await fetch(`/api/calls/${roomId}`);
                const roomData = await roomRes.json();
                if (roomData.room?.status === "ended" || roomData.room?.status === "rejected") {
                    setStatus("ended");
                    cleanup();
                }
            } catch (error) {
                console.error("Error polling signals:", error);
            }
        }, 1000);
    };

    const handleSignal = async (signal: { signalType: string; signalData: unknown }) => {
        const pc = peerConnectionRef.current;
        if (!pc) return;

        try {
            switch (signal.signalType) {
                case "offer": {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.signalData as unknown as RTCSessionDescriptionInit));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await sendSignal("answer", answer);
                    break;
                }
                case "answer": {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.signalData as unknown as RTCSessionDescriptionInit));
                    break;
                }
                case "ice-candidate": {
                    if (signal.signalData) {
                        await pc.addIceCandidate(new RTCIceCandidate(signal.signalData as unknown as RTCIceCandidateInit));
                    }
                    break;
                }
            }
        } catch (error) {
            console.error("Error handling signal:", error);
        }
    };

    // Controls
    const toggleMute = () => {
        const stream = localStreamRef.current;
        if (!stream) return;
        stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsMuted(!isMuted);
    };

    const toggleCamera = () => {
        const stream = localStreamRef.current;
        if (!stream) return;
        stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsCameraOff(!isCameraOff);
    };

    const toggleScreenShare = async () => {
        const pc = peerConnectionRef.current;
        if (!pc) return;

        if (isScreenSharing) {
            // Volver a cámara
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
            }
            const stream = localStreamRef.current;
            if (stream) {
                const videoTrack = stream.getVideoTracks()[0];
                const sender = pc.getSenders().find(s => s.track?.kind === "video");
                if (sender && videoTrack) {
                    sender.replaceTrack(videoTrack);
                }
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            }
            setIsScreenSharing(false);
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false,
                });
                screenStreamRef.current = screenStream;

                const screenTrack = screenStream.getVideoTracks()[0];
                const sender = pc.getSenders().find(s => s.track?.kind === "video");
                if (sender) {
                    sender.replaceTrack(screenTrack);
                }

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }

                // Cuando el usuario deje de compartir desde el navegador
                screenTrack.onended = () => {
                    toggleScreenShare();
                };

                setIsScreenSharing(true);
            } catch {
                console.log("Screen share cancelled");
            }
        }
    };

    const endCall = async () => {
        try {
            await fetch(`/api/calls/${roomId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "end", callDuration }),
            });
        } catch (e) {
            console.error("Error ending call:", e);
        }
        cleanup();
        setStatus("ended");
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    // Ended state
    if (status === "ended") {
        return (
            <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50">
                <div className="text-center space-y-6">
                    <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mx-auto">
                        <PhoneOff className="w-10 h-10 text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Llamada finalizada</h2>
                        {callDuration > 0 && (
                            <p className="text-gray-400 mt-1">Duración: {formatDuration(callDuration)}</p>
                        )}
                    </div>
                    <button
                        onClick={() => router.replace("/messages")}
                        className="px-8 py-3 bg-accent text-white rounded-xl font-semibold hover:opacity-90 transition"
                    >
                        Volver a Mensajes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-950 flex flex-col z-50">
            {/* Video Area */}
            <div className="flex-1 relative overflow-hidden">
                {/* Remote Video (Full screen) */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Connecting overlay */}
                {status !== "connected" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-950 to-black">
                        {otherUser?.avatarUrl ? (
                            <img src={otherUser.avatarUrl} alt="" className="w-32 h-32 rounded-full mb-6 ring-4 ring-white/10 animate-pulse" />
                        ) : (
                            <div className="w-32 h-32 rounded-full mb-6 bg-accent flex items-center justify-center ring-4 ring-white/10 animate-pulse">
                                <span className="text-5xl text-white font-bold">
                                    {otherUser?.username?.[0]?.toUpperCase() || "?"}
                                </span>
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-white mb-2">{otherUser?.username || "..."}</h2>
                        <div className="flex items-center gap-2 text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>{isCaller ? "Llamando..." : "Conectando..."}</span>
                        </div>
                    </div>
                )}

                {/* Local Video (PiP) */}
                <div className="absolute bottom-24 right-4 w-36 h-48 sm:w-48 sm:h-64 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-gray-900">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
                    />
                    {isCameraOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                            <VideoOff className="w-8 h-8 text-gray-500" />
                        </div>
                    )}
                </div>

                {/* Call info bar */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${status === "connected" ? "bg-green-500 animate-pulse" : "bg-yellow-500 animate-pulse"}`} />
                        <span className="text-white text-sm font-medium">
                            {status === "connected" ? formatDuration(callDuration) : "Conectando..."}
                        </span>
                    </div>
                    {isScreenSharing && (
                        <div className="bg-red-500/20 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-red-400" />
                            <span className="text-red-400 text-sm font-medium">Compartiendo pantalla</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-gray-900/80 backdrop-blur-xl border-t border-white/10 px-6 py-5">
                <div className="flex items-center justify-center gap-4">
                    {/* Mute */}
                    <button
                        onClick={toggleMute}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                        title={isMuted ? "Activar micrófono" : "Silenciar"}
                    >
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    {/* Camera */}
                    {callType === "video" && (
                        <button
                            onClick={toggleCamera}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isCameraOff
                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                : "bg-white/10 text-white hover:bg-white/20"
                                }`}
                            title={isCameraOff ? "Activar cámara" : "Desactivar cámara"}
                        >
                            {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </button>
                    )}

                    {/* Screen Share */}
                    <button
                        onClick={toggleScreenShare}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isScreenSharing
                            ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                            : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                        title={isScreenSharing ? "Dejar de compartir" : "Compartir pantalla"}
                    >
                        {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                    </button>

                    {/* End Call */}
                    <button
                        onClick={endCall}
                        className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 hover:scale-105"
                        title="Finalizar llamada"
                    >
                        <PhoneOff className="w-7 h-7" />
                    </button>
                </div>
            </div>
        </div>
    );
}
