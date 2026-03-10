"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, Monitor,
    MonitorOff, Loader2, Phone, AlertCircle, RefreshCw, Users
} from "lucide-react";

type CallRoomProps = {
    roomId: string;
};

const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    // TURN servers for NAT traversal (free tier)
    {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
    },
    {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
    },
];

type CallStatus = "loading" | "connecting" | "connected" | "ended" | "error";
type ErrorType = "permissions" | "room_not_found" | "connection_failed" | "unknown";

export default function CallRoom({ roomId }: CallRoomProps) {
    const router = useRouter();
    const [status, setStatus] = useState<CallStatus>("loading");
    const [error, setError] = useState<ErrorType | null>(null);
    const [isCaller, setIsCaller] = useState(false);
    const [otherUser, setOtherUser] = useState<{ id: string; username: string; avatarUrl?: string } | null>(null);
    const [callType, setCallType] = useState<"video" | "audio">("video");

    // Media states
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [connectionState, setConnectionState] = useState<string>("");
    const [isReconnecting, setIsReconnecting] = useState(false);

    // Refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasInitiatedRef = useRef(false);
    const processedSignalsRef = useRef<Set<string>>(new Set());
    const reconnectAttemptsRef = useRef(0);

    useEffect(() => {
        initCall();
        return () => { cleanup(); };
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

    const requestMedia = async (callType: "video" | "audio"): Promise<MediaStream> => {
        try {
            return await navigator.mediaDevices.getUserMedia({
                video: callType === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
                audio: { echoCancellation: true, noiseSuppression: true },
            });
        } catch (err: unknown) {
            const mediaError = err as { name?: string };
            if (mediaError.name === "NotAllowedError" || mediaError.name === "PermissionDeniedError") {
                throw new Error("permissions");
            } else if (mediaError.name === "NotFoundError" || mediaError.name === "DevicesNotFoundError") {
                // No camera/mic found — try audio only
                if (callType === "video") {
                    return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                }
                throw new Error("permissions");
            }
            throw err;
        }
    };

    const initCall = async () => {
        try {
            const res = await fetch(`/api/calls/${roomId}`);
            if (!res.ok) {
                setError("room_not_found");
                setStatus("error");
                return;
            }
            const data = await res.json();

            setOtherUser(data.otherUser);
            setIsCaller(data.isCaller);
            setCallType(data.room.callType);

            if (data.room.status === "ended" || data.room.status === "rejected" || data.room.status === "missed") {
                setStatus("ended");
                return;
            }

            setStatus("connecting");

            let stream: MediaStream;
            try {
                stream = await requestMedia(data.room.callType);
            } catch (err: unknown) {
                const mediaError = err as { message?: string };
                if (mediaError.message === "permissions") {
                    setError("permissions");
                } else {
                    setError("unknown");
                }
                setStatus("error");
                return;
            }

            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            if (!data.isCaller) {
                // Callee joins the call
                await fetch(`/api/calls/${roomId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "join" }),
                });
            }

            createPeerConnection(stream, data.isCaller, data.currentUserId);
            startSignalPolling();

            // If caller, wait for callee to join before creating offer
            if (data.isCaller && data.room.status === "ringing") {
                // Poll until callee joins (status becomes "active")
                const waitForCallee = setInterval(async () => {
                    try {
                        const checkRes = await fetch(`/api/calls/${roomId}`);
                        if (checkRes.ok) {
                            const checkData = await checkRes.json();
                            if (checkData.room.status === "active") {
                                clearInterval(waitForCallee);
                                // Now create the offer
                                const pc = peerConnectionRef.current;
                                if (pc && !hasInitiatedRef.current) {
                                    hasInitiatedRef.current = true;
                                    createOffer(pc, false);
                                }
                            } else if (checkData.room.status === "rejected" || checkData.room.status === "ended" || checkData.room.status === "missed") {
                                clearInterval(waitForCallee);
                                setStatus("ended");
                            }
                        }
                    } catch { /* retry */ }
                }, 1000);
                // Timeout after 30s
                setTimeout(() => clearInterval(waitForCallee), 30000);
            }

        } catch {
            setError("unknown");
            setStatus("error");
        }
    };

    const createPeerConnection = (stream: MediaStream, amICaller: boolean, _myUserId: string) => {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peerConnectionRef.current = pc;

        stream.getTracks().forEach(track => { pc.addTrack(track, stream); });

        pc.ontrack = (event) => {
            if (remoteVideoRef.current && event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
            setStatus("connected");
            setIsReconnecting(false);
            reconnectAttemptsRef.current = 0;
            if (!durationRef.current) {
                durationRef.current = setInterval(() => {
                    setCallDuration(prev => prev + 1);
                }, 1000);
            }
        };

        pc.onicecandidate = async (event) => {
            if (event.candidate) {
                await sendSignal("ice-candidate", event.candidate.toJSON());
            }
        };

        pc.onconnectionstatechange = () => {
            setConnectionState(pc.connectionState);
            if (pc.connectionState === "failed") {
                handleConnectionFailed();
            } else if (pc.connectionState === "disconnected") {
                setIsReconnecting(true);
            } else if (pc.connectionState === "connected") {
                setIsReconnecting(false);
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === "failed") {
                // Try ICE restart
                if (amICaller && reconnectAttemptsRef.current < 3) {
                    reconnectAttemptsRef.current++;
                    pc.restartIce();
                    createOffer(pc, true);
                }
            }
        };

        // For callee: create offer immediately when peer connection is ready
        // For caller: offer is created after callee joins (see initCall)
        if (!amICaller && !hasInitiatedRef.current) {
            // Callee doesn't create offer; they wait for caller's offer via signals
        }
    };

    const handleConnectionFailed = () => {
        if (reconnectAttemptsRef.current >= 3) {
            setError("connection_failed");
            setStatus("error");
            return;
        }
        // Will be handled by ICE restart in oniceconnectionstatechange
    };

    const createOffer = async (pc: RTCPeerConnection, isRestart: boolean) => {
        try {
            const offer = await pc.createOffer(isRestart ? { iceRestart: true } : {});
            await pc.setLocalDescription(offer);
            await sendSignal("offer", offer);
        } catch (err) { console.error('Error creating offer:', err); }
    };

    const sendSignal = async (signalType: string, signalData: unknown) => {
        try {
            await fetch(`/api/calls/${roomId}/signal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ signalType, signalData }),
            });
        } catch { /* ignore */ }
    };

    const startSignalPolling = () => {
        const poll = async () => {
            try {
                const pc = peerConnectionRef.current;
                if (!pc) return;

                // Also check room status
                const [sigRes, roomRes] = await Promise.all([
                    fetch(`/api/calls/${roomId}/signal`),
                    fetch(`/api/calls/${roomId}`),
                ]);

                if (roomRes.ok) {
                    const roomData = await roomRes.json();
                    if (roomData.room.status === "ended" || roomData.room.status === "rejected") {
                        setStatus("ended");
                        cleanup();
                        return;
                    }
                }

                if (!sigRes.ok) return;
                const { signals } = await sigRes.json();

                for (const signal of (signals || [])) {
                    if (processedSignalsRef.current.has(signal.id)) continue;
                    processedSignalsRef.current.add(signal.id);
                    await handleSignal(pc, signal);
                }
            } catch (err) { console.error('Signal polling error:', err); }
        };

        // Poll every 800ms for faster signaling (was 2000ms)
        pollingRef.current = setInterval(poll, 800);
        // Also run immediately
        poll();
    };

    const handleSignal = async (pc: RTCPeerConnection, signal: { signalType: string; signalData: unknown }) => {
        try {
            switch (signal.signalType) {
                case "offer": {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.signalData as RTCSessionDescriptionInit));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await sendSignal("answer", answer);
                    break;
                }
                case "answer": {
                    if (pc.signalingState === "have-local-offer") {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal.signalData as RTCSessionDescriptionInit));
                    }
                    break;
                }
                case "ice-candidate": {
                    if (signal.signalData && pc.remoteDescription) {
                        await pc.addIceCandidate(new RTCIceCandidate(signal.signalData as RTCIceCandidateInit));
                    }
                    break;
                }
            }
        } catch { /* ignore signal errors */ }
    };

    // Controls
    const toggleMute = () => {
        const stream = localStreamRef.current;
        if (!stream) return;
        stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsMuted(prev => !prev);
    };

    const toggleCamera = () => {
        const stream = localStreamRef.current;
        if (!stream) return;
        stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsCameraOff(prev => !prev);
    };

    const toggleScreenShare = async () => {
        const pc = peerConnectionRef.current;
        if (!pc) return;

        if (isScreenSharing) {
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
            }
            const stream = localStreamRef.current;
            if (stream) {
                const videoTrack = stream.getVideoTracks()[0];
                const sender = pc.getSenders().find(s => s.track?.kind === "video");
                if (sender && videoTrack) sender.replaceTrack(videoTrack);
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            }
            setIsScreenSharing(false);
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                screenStreamRef.current = screenStream;
                const screenTrack = screenStream.getVideoTracks()[0];
                const sender = pc.getSenders().find(s => s.track?.kind === "video");
                if (sender) sender.replaceTrack(screenTrack);
                if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
                screenTrack.onended = () => toggleScreenShare();
                setIsScreenSharing(true);
            } catch { /* user cancelled */ }
        }
    };

    const endCall = async () => {
        try {
            await fetch(`/api/calls/${roomId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "end", callDuration }),
            });
        } catch { /* ignore */ }
        cleanup();
        setStatus("ended");
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    // ─── Error screen ───────────────────────────────────────────────────
    if (status === "error") {
        const messages: Record<ErrorType, { title: string; desc: string; action?: string }> = {
            permissions: {
                title: "Sin acceso a cámara/micrófono",
                desc: "Necesitas dar permiso al navegador para acceder a tu cámara y micrófono.",
                action: "Revisa la barra de dirección y permite el acceso, luego recarga.",
            },
            room_not_found: {
                title: "Sala no encontrada",
                desc: "Esta llamada ya no existe o ha expirado.",
            },
            connection_failed: {
                title: "Conexión fallida",
                desc: "No se pudo establecer la conexión P2P. Puede ser un problema de red o firewall.",
                action: "Intenta desde una red diferente.",
            },
            unknown: {
                title: "Error inesperado",
                desc: "Ocurrió un error al iniciar la llamada.",
            },
        };

        const msg = messages[error!] ?? messages.unknown;

        return (
            <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50 p-6">
                <div className="text-center space-y-4 max-w-sm">
                    <div className="w-20 h-20 rounded-full bg-red-900/30 flex items-center justify-center mx-auto">
                        <AlertCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{msg.title}</h2>
                    <p className="text-gray-400 text-sm">{msg.desc}</p>
                    {msg.action && <p className="text-yellow-400 text-sm">{msg.action}</p>}
                    <button
                        onClick={() => router.replace("/messages")}
                        className="w-full py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition font-semibold"
                    >
                        Volver a Mensajes
                    </button>
                </div>
            </div>
        );
    }

    // ─── Ended screen ────────────────────────────────────────────────────
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

    // ─── Main call UI ────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
            {/* Remote video (full screen) */}
            <div className="flex-1 relative bg-gray-900 overflow-hidden">
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />

                {/* Status indicator */}
                {(status === "connecting" || isReconnecting) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/80">
                        {otherUser?.avatarUrl ? (
                            <img src={otherUser.avatarUrl} alt={otherUser.username} className="w-28 h-28 rounded-full mb-4 border-4 border-white/10" />
                        ) : (
                            <div className="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center mb-4">
                                <Users className="w-12 h-12 text-gray-500" />
                            </div>
                        )}
                        <p className="text-white font-semibold text-lg">{otherUser?.username}</p>
                        <div className="flex items-center gap-2 mt-3 text-gray-400 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{isReconnecting ? "Reconectando..." : "Conectando..."}</span>
                        </div>
                    </div>
                )}

                {/* Connection quality / reconnecting badge */}
                {isReconnecting && status === "connected" && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-600/90 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Reconectando...
                    </div>
                )}

                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status === "connected" ? "bg-green-400" : "bg-yellow-400"} ${status === "connected" ? "animate-pulse" : ""}`} />
                        <span className="text-white text-sm font-medium">
                            {status === "connected" ? formatDuration(callDuration) : "Conectando..."}
                        </span>
                    </div>
                    {isScreenSharing && (
                        <div className="bg-blue-600/80 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                            <Monitor className="w-3 h-3" />
                            Compartiendo pantalla
                        </div>
                    )}
                    <div className="text-white text-sm opacity-60">
                        {otherUser?.username}
                    </div>
                </div>

                {/* Local video PiP */}
                {callType === "video" && (
                    <div className="absolute bottom-24 right-4 w-32 h-24 md:w-40 md:h-28 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${isCameraOff ? "invisible" : ""}`}
                        />
                        {isCameraOff && (
                            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                                <VideoOff className="w-6 h-6 text-gray-500" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Audio-only local stream (hidden) */}
            {callType === "audio" && (
                <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
            )}

            {/* Controls bar */}
            <div className="bg-gray-900/95 backdrop-blur-sm px-6 py-4 safe-area-inset-bottom">
                <div className="flex items-center justify-center gap-4 max-w-sm mx-auto">
                    {/* Mute */}
                    <button
                        onClick={toggleMute}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"}`}
                        title={isMuted ? "Activar micrófono" : "Silenciar"}
                    >
                        {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
                    </button>

                    {/* End call */}
                    <button
                        onClick={endCall}
                        className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 hover:scale-105"
                        title="Terminar llamada"
                    >
                        <PhoneOff className="w-7 h-7 text-white" />
                    </button>

                    {/* Camera (video calls only) */}
                    {callType === "video" && (
                        <button
                            onClick={toggleCamera}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isCameraOff ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"}`}
                            title={isCameraOff ? "Activar cámara" : "Apagar cámara"}
                        >
                            {isCameraOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
                        </button>
                    )}

                    {/* Screen share */}
                    <button
                        onClick={toggleScreenShare}
                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}
                        title={isScreenSharing ? "Dejar de compartir" : "Compartir pantalla"}
                    >
                        {isScreenSharing ? <MonitorOff className="w-6 h-6 text-white" /> : <Monitor className="w-6 h-6 text-white" />}
                    </button>
                </div>
            </div>

            {/* Audio-only UI (no remote video) */}
            {callType === "audio" && status !== "connected" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <div className="relative mx-auto w-32 h-32 mb-4">
                            <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                            {otherUser?.avatarUrl ? (
                                <img src={otherUser.avatarUrl} alt="" className="relative w-32 h-32 rounded-full" />
                            ) : (
                                <div className="relative w-32 h-32 rounded-full bg-accent/30 flex items-center justify-center">
                                    <Phone className="w-16 h-16 text-accent" />
                                </div>
                            )}
                        </div>
                        <p className="text-white font-bold text-xl">{otherUser?.username}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
