// ============================================================================
// VIDEO CALL WINDOW COMPONENT
// ============================================================================
// Displays video call interface with local/remote video streams
// Provides controls for mute, camera toggle, and call termination
// Handles both incoming and outgoing calls
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import {
    Phone,
    PhoneOff,
    Mic,
    MicOff,
    Video,
    VideoOff,
    Minimize2,
    Maximize2,
    User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/avatar';
import { toastError } from '@/lib/utils';
import {
    getLocalStream,
    getRemoteStream,
    toggleAudio,
    toggleVideo,
    endCall,
    rejectCall,
    acceptCall,
    onLocalStream,
    onRemoteStream,
    onCallEnded,
    onStateChange,
    type CallInfo,
    type WebRTCState
} from '@/lib/webrtc';

// ============================================================================
// PROPS INTERFACE
// ============================================================================

interface VideoCallWindowProps {
    /** Call information (participant details, state, etc.) */
    callInfo: CallInfo;
    /** Callback when call window should be closed */
    onClose: () => void;
}

// ============================================================================
// VIDEO CALL WINDOW COMPONENT
// ============================================================================

export const VideoCallWindow = ({ callInfo, onClose }: VideoCallWindowProps) => {
    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    /** Current call state (calling, ringing, connected, ended) */
    const [callState, setCallState] = useState<WebRTCState>(callInfo.state);

    /** Audio enabled/disabled state */
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);

    /** Video enabled/disabled state */
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    /** Window minimized/maximized state */
    const [isMinimized, setIsMinimized] = useState(false);

    /** Connection timer (shows call duration) */
    const [callDuration, setCallDuration] = useState(0);

    /** Show/hide controls on hover */
    const [showControls, setShowControls] = useState(true);

    /** Hide controls timeout */
    const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /** Call timeout for unanswered calls (1 minute) */
    const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ========================================================================
    // VIDEO ELEMENT REFS
    // ========================================================================

    /** Ref for local video element (user's camera) */
    const localVideoRef = useRef<HTMLVideoElement>(null);

    /** Ref for remote video element (other participant's camera) */
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    /** Ref for call duration timer interval */
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // ========================================================================
    // EFFECTS
    // ========================================================================

    /**
     * Initialize video streams and WebRTC event listeners
     * Set up local and remote video elements
     * Clean up on unmount
     */
    useEffect(() => {
        // Set up local video stream
        const localStream = getLocalStream();
        if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
            // Ensure video plays
            localVideoRef.current.play().catch(err => {
                console.warn('[VideoCallWindow] Local video autoplay failed:', err);
            });
            console.log('[VideoCallWindow] Local video stream attached');
        }

        // Set up remote video stream (if already available)
        const remoteStream = getRemoteStream();
        if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            // Ensure video plays
            remoteVideoRef.current.play().catch(err => {
                console.warn('[VideoCallWindow] Remote video autoplay failed:', err);
            });
            console.log('[VideoCallWindow] Remote video stream attached');
        }

        // Listen for local stream updates
        const unsubscribeLocalStream = onLocalStream((stream) => {
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.play().catch(err => {
                    console.warn('[VideoCallWindow] Local video play failed:', err);
                });
                console.log('[VideoCallWindow] Local video stream updated');
            }
        });

        // Listen for remote stream updates
        const unsubscribeRemoteStream = onRemoteStream((stream) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
                remoteVideoRef.current.play().catch(err => {
                    console.warn('[VideoCallWindow] Remote video play failed:', err);
                });
                console.log('[VideoCallWindow] Remote video stream updated');
            }
        });

        // Listen for call state changes from WebRTC library
        // This is the critical callback that updates UI when call state transitions
        // States: 'calling' → 'ringing' → 'connected' → 'ended'
        const unsubscribeStateChange = onStateChange((state) => {
            console.log(`[VideoCallWindow] ===== CALL STATE CHANGED: ${callState} → ${state} =====`);
            
            // Update local state - this triggers re-render
            // When state changes from 'ringing' to 'connected', the component will re-render
            // and show the full video call UI instead of the accept/reject screen
            setCallState(state);

            // Clear call timeout when call connects
            // No need to auto-end call after connection is established
            if (state === 'connected' && callTimeoutRef.current) {
                console.log('[VideoCallWindow] Call connected, clearing timeout');
                clearTimeout(callTimeoutRef.current);
                callTimeoutRef.current = null;
            }

            // Start timer when call connects
            // Shows call duration in UI (00:00, 00:01, 00:02, etc.)
            if (state === 'connected' && !timerRef.current) {
                console.log('[VideoCallWindow] Starting call duration timer');
                timerRef.current = setInterval(() => {
                    setCallDuration(prev => prev + 1);
                }, 1000);
            }
        });

        // Listen for call end
        const unsubscribeCallEnded = onCallEnded(() => {
            console.log('[VideoCallWindow] Call ended');
            handleCallEnd();
        });

        /**
         * Set timeout for unanswered calls (both outgoing and incoming)
         * - Outgoing calls ('calling'): Auto-end after 60 seconds if no answer
         * - Incoming calls ('ringing'): Auto-reject after 60 seconds if no user response
         * This prevents calls from hanging indefinitely and properly releases resources
         */
        if (callState === 'calling' || callState === 'ringing') {
            const timeoutDuration = 60000; // 60 seconds

            callTimeoutRef.current = setTimeout(() => {
                console.log(`[VideoCallWindow] Call timeout - no response after ${timeoutDuration / 1000} seconds`);

                if (callState === 'ringing' && callInfo.direction === 'incoming') {
                    // Incoming call that wasn't answered - auto-reject
                    console.log('[VideoCallWindow] Auto-rejecting incoming call due to timeout');
                    handleRejectCall();
                } else {
                    // Outgoing call that wasn't answered - auto-end
                    console.log('[VideoCallWindow] Auto-ending outgoing call due to timeout');
                    handleEndCall();
                }
            }, timeoutDuration);
        }

        // Cleanup function
        return () => {
            // Unsubscribe from WebRTC events
            unsubscribeLocalStream?.();
            unsubscribeRemoteStream?.();
            unsubscribeStateChange?.();
            unsubscribeCallEnded?.();

            // Clear all timers
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            if (callTimeoutRef.current) {
                clearTimeout(callTimeoutRef.current);
                callTimeoutRef.current = null;
            }

            if (hideControlsTimeoutRef.current) {
                clearTimeout(hideControlsTimeoutRef.current);
                hideControlsTimeoutRef.current = null;
            }

            // IMPORTANT: Do NOT stop media tracks here
            // The WebRTC library (webrtc.ts) handles track cleanup in its cleanup() function
            // Stopping tracks here causes race conditions and tracks may be stopped twice
            // Let the endCall() or cleanup() function in webrtc.ts handle all media cleanup
            console.log('[VideoCallWindow] Component unmounting, cleanup delegated to WebRTC library');
        };
    }, [callState]);

    // ========================================================================
    // EFFECT: Ensure videos play when minimized state changes
    // ========================================================================
    useEffect(() => {
        // Re-attach streams and ensure playback when minimizing/maximizing
        const localStream = getLocalStream();
        const remoteStream = getRemoteStream();

        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(err => {
                console.warn('[VideoCallWindow] Failed to play local video:', err);
            });
        }

        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(err => {
                console.warn('[VideoCallWindow] Failed to play remote video:', err);
            });
        }
    }, [isMinimized]);

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    /**
     * Format call duration as MM:SS
     */
    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    /**
     * Get call status text based on current state
     */
    // const getStatusText = (): string => {
    //     switch (callState) {
    //         case 'calling':
    //             return 'Calling...';
    //         case 'ringing':
    //             return 'Incoming Call...';
    //         case 'connected':
    //             return formatDuration(callDuration);
    //         case 'ended':
    //             return 'Call Ended';
    //         default:
    //             return '';
    //     }
    // };

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    /**
     * Toggle audio on/off
     */
    const handleToggleAudio = () => {
        const newState = !isAudioEnabled;
        toggleAudio(newState);
        setIsAudioEnabled(newState);
    };

    /**
     * Toggle video on/off
     */
    const handleToggleVideo = () => {
        const newState = !isVideoEnabled;
        toggleVideo(newState);
        setIsVideoEnabled(newState);
    };

    /**
     * End call and close window
     * Note: endCall() will trigger cleanup() which calls onCallEnded callback
     * The callback will then invoke handleCallEnd() to clean up UI
     */
    const handleEndCall = () => {
        endCall();
        // Don't call handleCallEnd() here - it will be called via onCallEnded callback
        // to ensure proper sequencing: cleanup() happens first, then UI closes
    };

    /**
     * Clean up UI and close window
     * IMPORTANT: This function only handles UI cleanup
     * Media track cleanup is handled by WebRTC library's cleanup() function
     * to prevent race conditions and ensure proper resource release
     */
    const handleCallEnd = () => {
        console.log('[VideoCallWindow] Cleaning up UI and closing window');

        // Clear all UI timers
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
        }

        if (hideControlsTimeoutRef.current) {
            clearTimeout(hideControlsTimeoutRef.current);
            hideControlsTimeoutRef.current = null;
        }

        // IMPORTANT: Do NOT stop media tracks here
        // The endCall() function in webrtc.ts calls cleanup() which stops all tracks
        // Stopping tracks here causes race conditions:
        // 1. Track may already be stopped by cleanup()
        // 2. Track may be in 'ended' state, causing errors
        // 3. Multiple stop() calls can interfere with proper cleanup
        // Let the WebRTC library handle all media cleanup centrally

        // Add a small delay before closing to ensure track.stop() completes
        // track.stop() is synchronous but may need a moment to release hardware
        setTimeout(() => {
            console.log('[VideoCallWindow] UI cleanup complete, closing window');
            onClose();
        }, 100);
    };

    /**
     * Accept incoming call
     * Flow: User clicks accept → acceptCall() starts → Media stream acquired → 
     * Peer connection created → Answer sent → State updates to 'connected' → 
     * UI transitions from ringing screen to video call interface
     */
    const handleAcceptCall = async () => {
        console.log('[VideoCallWindow] Accept button clicked');
        try {
            // Call the WebRTC library's acceptCall function
            // This will:
            // 1. Get local media stream (camera + microphone)
            // 2. Create peer connection
            // 3. Set remote description (offer from caller)
            // 4. Create and send answer
            // 5. Update state to 'connected'
            await acceptCall();
            console.log('[VideoCallWindow] Call accepted successfully, waiting for state update');
            
            // Note: State will be updated via onStateChange callback
            // The VideoCallWindow will re-render when callState changes from 'ringing' to 'connected'
            // This will transition from the accept/reject screen to the full video call UI
        } catch (error) {
            console.error('[VideoCallWindow] Error accepting call:', error);
            // Show error to user and close call window
            toastError('Could not accept the call. Please check your camera and microphone permissions.');
            handleCallEnd();
        }
    };

    /**
     * Reject incoming call
     */
    const handleRejectCall = () => {
        rejectCall();
        handleCallEnd();
    };

    /**
     * Toggle minimize/maximize
     */
    const handleToggleMinimize = () => {
        setIsMinimized(!isMinimized);
    };

    /**
     * Handle mouse move to show controls
     */
    const handleMouseMove = () => {
        setShowControls(true);

        // Clear existing timeout
        if (hideControlsTimeoutRef.current) {
            clearTimeout(hideControlsTimeoutRef.current);
        }

        // Hide controls after 3 seconds of inactivity (only during active call)
        if (callState === 'connected') {
            hideControlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    };

    // ========================================================================
    // RENDER
    // ========================================================================
    // Component has 3 main render modes based on call state:
    // 1. Incoming call (ringing + incoming) - Shows accept/reject buttons
    // 2. Minimized (isMinimized = true) - Small floating window  
    // 3. Full screen (connected/calling) - Main video call interface
    // ========================================================================

    console.log(`[VideoCallWindow] Rendering with state: ${callState}, direction: ${callInfo.direction}, minimized: ${isMinimized}`);

    // MODE 1: Incoming call - Full screen modal with accept/reject buttons
    // Only shown when: state is 'ringing' AND direction is 'incoming'
    // After accepting, state changes to 'connected' and this screen is no longer shown
    if (callState === 'ringing' && callInfo.direction === 'incoming') {
        console.log('[VideoCallWindow] Rendering incoming call screen (ringing + incoming)');
        return (
            <div className="fixed inset-0 z-[100] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center animate-in fade-in duration-300">
                {/* Background blur effect */}
                <div className="absolute inset-0 backdrop-blur-sm bg-black/30" />

                {/* Incoming call content */}
                <div className="relative z-10 flex flex-col items-center gap-8 text-center px-8">
                    {/* Avatar with pulse animation */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                        <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse" />
                        <Avatar className="h-32 w-32 border-4 border-white/20 shadow-2xl relative">
                            <AvatarImage src={callInfo.remoteUserAvatar || getAvatarUrl()} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                                <User className="h-16 w-16 text-white" />
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Caller info */}
                    <div className="space-y-2">
                        <h2 className="text-4xl font-bold text-white">
                            {callInfo.remoteUserName}
                        </h2>
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            <p className="text-xl text-gray-300">Incoming video call...</p>
                        </div>
                    </div>

                    {/* Call action buttons */}
                    <div className="flex items-center gap-8 mt-8">
                        {/* Reject button */}
                        <div className="flex flex-col items-center gap-3">
                            <Button
                                size="lg"
                                onClick={handleRejectCall}
                                className="rounded-full h-20 w-20 p-0 bg-red-500 hover:bg-red-600 shadow-2xl hover:scale-110 transition-all duration-200"
                            >
                                <PhoneOff className="h-8 w-8" />
                            </Button>
                            <span className="text-sm text-gray-400">Decline</span>
                        </div>

                        {/* Accept button */}
                        <div className="flex flex-col items-center gap-3">
                            <Button
                                size="lg"
                                onClick={handleAcceptCall}
                                className="rounded-full h-20 w-20 p-0 bg-green-500 hover:bg-green-600 shadow-2xl hover:scale-110 transition-all duration-200 animate-pulse"
                            >
                                <Phone className="h-8 w-8" />
                            </Button>
                            <span className="text-sm text-gray-400">Accept</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // MODE 2: Minimized view - Floating window
    // Shows small pip-style window in bottom right corner
    if (isMinimized) {
        console.log('[VideoCallWindow] Rendering minimized floating window');
        return (
            <div className="fixed bottom-4 right-4 w-80 rounded-2xl overflow-hidden shadow-2xl z-[100] animate-in slide-in-from-bottom-4 duration-300">
                <div className="relative bg-gray-900 border border-gray-700">
                    {/* Video preview */}
                    <div className="relative h-48 bg-gray-950">
                        {/* Remote video - always render */}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                            style={{ display: 'block' }}
                        />

                        {/* Fallback avatar when no video */}
                        {callState !== 'connected' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={callInfo.remoteUserAvatar || getAvatarUrl()} />
                                    <AvatarFallback>
                                        <User className="h-8 w-8" />
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        )}

                        {/* Small local video - always render */}
                        <div className="absolute top-2 right-2 w-20 h-16 rounded-lg overflow-hidden border border-gray-600 shadow-lg bg-gray-900">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                                style={{ transform: 'scaleX(-1)', display: 'block' }}
                            />
                            {!isVideoEnabled && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                    <VideoOff className="h-4 w-4 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Minimize overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-white text-sm font-medium">
                                        {formatDuration(callDuration)}
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleToggleMinimize}
                                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                                >
                                    <Maximize2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-2 p-2 bg-gray-800/95 backdrop-blur-sm">
                        <Button
                            size="sm"
                            variant={isAudioEnabled ? 'ghost' : 'destructive'}
                            onClick={handleToggleAudio}
                            className="h-9 w-9 p-0 rounded-full"
                        >
                            {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                        </Button>
                        <Button
                            size="sm"
                            variant={isVideoEnabled ? 'ghost' : 'destructive'}
                            onClick={handleToggleVideo}
                            className="h-9 w-9 p-0 rounded-full"
                        >
                            {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleEndCall}
                            className="h-9 w-9 p-0 rounded-full"
                        >
                            <PhoneOff className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // MODE 3: Full screen call view
    // Shows main video call interface with controls
    // Displayed when: state is 'calling', 'connected', or other states (not incoming ringing)
    console.log('[VideoCallWindow] Rendering full screen call view');
    return (
        <div
            className="fixed inset-0 z-[100] bg-black"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => callState === 'connected' && setShowControls(false)}
        >
            {/* Main video area */}
            <div className="relative w-full h-full">
                {/* Remote video (full screen) */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />

                {/* Fallback when no remote video */}
                {callState !== 'connected' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                        <Avatar className="h-48 w-48 border-4 border-white/10 shadow-2xl mb-6">
                            <AvatarImage src={callInfo.remoteUserAvatar || getAvatarUrl()} />
                            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-600">
                                <User className="h-24 w-24 text-white" />
                            </AvatarFallback>
                        </Avatar>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {callInfo.remoteUserName}
                        </h2>
                        <p className="text-gray-400 text-lg">
                            {callState === 'calling' ? 'Calling...' : 'Connecting...'}
                        </p>
                    </div>
                )}

                {/* Local video (picture-in-picture) */}
                <div
                    className={`absolute top-6 right-6 w-64 h-48 rounded-2xl overflow-hidden border-2 border-white/20 bg-gray-900 shadow-2xl transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                >
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }}
                    />
                    {!isVideoEnabled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <div className="flex flex-col items-center gap-2">
                                <VideoOff className="h-12 w-12 text-gray-500" />
                                <span className="text-sm text-gray-500">Camera off</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Top bar - Call info and minimize */}
                <div
                    className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-6 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
                        }`}
                >
                    <div className="flex items-center justify-between max-w-7xl mx-auto">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-white/20">
                                <AvatarImage src={callInfo.remoteUserAvatar || getAvatarUrl()} />
                                <AvatarFallback>
                                    <User className="h-6 w-6" />
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-white text-lg">
                                    {callInfo.remoteUserName}
                                </p>
                                <div className="flex items-center gap-2">
                                    {callState === 'connected' && (
                                        <>
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-sm text-gray-300">
                                                {formatDuration(callDuration)}
                                            </span>
                                        </>
                                    )}
                                    {callState === 'calling' && (
                                        <span className="text-sm text-gray-400">Calling...</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleToggleMinimize}
                                className="h-10 w-10 rounded-full text-white hover:bg-white/20"
                            >
                                <Minimize2 className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Bottom controls bar */}
                <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent backdrop-blur-md p-8 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
                        }`}
                >
                    <div className="max-w-2xl mx-auto">
                        <div className="flex items-center justify-center gap-4">
                            {/* Microphone toggle */}
                            <div className="flex flex-col items-center gap-2">
                                <Button
                                    size="lg"
                                    variant={isAudioEnabled ? 'secondary' : 'destructive'}
                                    onClick={handleToggleAudio}
                                    className="h-14 w-14 rounded-full hover:scale-110 transition-transform shadow-lg"
                                >
                                    {isAudioEnabled ? (
                                        <Mic className="h-6 w-6" />
                                    ) : (
                                        <MicOff className="h-6 w-6" />
                                    )}
                                </Button>
                                <span className="text-xs text-gray-300">
                                    {isAudioEnabled ? 'Mute' : 'Unmute'}
                                </span>
                            </div>

                            {/* Video toggle */}
                            <div className="flex flex-col items-center gap-2">
                                <Button
                                    size="lg"
                                    variant={isVideoEnabled ? 'secondary' : 'destructive'}
                                    onClick={handleToggleVideo}
                                    className="h-14 w-14 rounded-full hover:scale-110 transition-transform shadow-lg"
                                >
                                    {isVideoEnabled ? (
                                        <Video className="h-6 w-6" />
                                    ) : (
                                        <VideoOff className="h-6 w-6" />
                                    )}
                                </Button>
                                <span className="text-xs text-gray-300">
                                    {isVideoEnabled ? 'Stop Video' : 'Start Video'}
                                </span>
                            </div>

                            {/* End call */}
                            <div className="flex flex-col items-center gap-2">
                                <Button
                                    size="lg"
                                    onClick={handleEndCall}
                                    className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 hover:scale-110 transition-transform shadow-lg"
                                >
                                    <PhoneOff className="h-7 w-7" />
                                </Button>
                                <span className="text-xs text-gray-300">End</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
