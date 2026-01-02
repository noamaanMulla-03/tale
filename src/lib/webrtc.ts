// ============================================================================
// WEBRTC UTILITY - WebRTC peer connection management for video calls
// ============================================================================
// Handles WebRTC peer connections, media streams, and ICE candidates
// Works in conjunction with Socket.IO for signaling
// ============================================================================

import { getSocket } from './socket';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * WebRTC connection state
 */
export type WebRTCState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

/**
 * Call direction (who initiated the call)
 */
export type CallDirection = 'outgoing' | 'incoming';

/**
 * Signaling message types for WebRTC handshake
 */
export interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate';
    from: number;
    to: number;
    conversationId: number;
    data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

/**
 * Call information for UI display
 */
export interface CallInfo {
    conversationId: number;
    remoteUserId: number;
    remoteUserName: string;
    remoteUserAvatar?: string;
    direction: CallDirection;
    state: WebRTCState;
}

// ============================================================================
// WEBRTC CONFIGURATION
// ============================================================================

/**
 * ICE (Interactive Connectivity Establishment) servers configuration
 * STUN servers help discover public IP address for NAT traversal
 * TURN servers relay traffic when direct connection fails
 */
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        // Google's public STUN servers
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Note: For production, consider using your own TURN server
        // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
    ],
    // Use ICE candidate gathering timeout
    iceTransportPolicy: 'all', // Can be 'all' or 'relay' (force TURN)
};

// ============================================================================
// WEBRTC STATE MANAGEMENT
// ============================================================================

/**
 * Current WebRTC peer connection instance
 * Null when no active call
 */
let peerConnection: RTCPeerConnection | null = null;

/**
 * Local media stream (user's camera and microphone)
 */
let localStream: MediaStream | null = null;

/**
 * Remote media stream (other user's camera and microphone)
 */
let remoteStream: MediaStream | null = null;

/**
 * Current call information
 */
let currentCall: CallInfo | null = null;

/**
 * Queue for ICE candidates received before remote description is set
 * WebRTC requires remote description to be set before adding ICE candidates
 */
let iceCandidateQueue: RTCIceCandidateInit[] = [];

/**
 * Flag to track if remote description has been set
 */
let remoteDescriptionSet = false;

// ============================================================================
// CALLBACK HANDLERS
// ============================================================================

/**
 * Callback for state changes (to update UI)
 */
let onStateChangeCallback: ((state: WebRTCState) => void) | null = null;

/**
 * Callback for remote stream availability (to display remote video)
 */
let onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;

/**
 * Callback for local stream availability (to display local video preview)
 */
let onLocalStreamCallback: ((stream: MediaStream) => void) | null = null;

/**
 * Callback for incoming call (to show incoming call UI)
 */
let onIncomingCallCallback: ((callInfo: CallInfo) => void) | null = null;

/**
 * Callback for call ended (to clean up UI)
 */
let onCallEndedCallback: (() => void) | null = null;

// ============================================================================
// CALLBACK REGISTRATION
// ============================================================================

/**
 * Register callback for state changes
 * @param callback - Function to call when call state changes
 * @returns Cleanup function to remove the callback
 */
export const onStateChange = (callback: (state: WebRTCState) => void): (() => void) => {
    onStateChangeCallback = callback;
    return () => {
        onStateChangeCallback = null;
    };
};

/**
 * Register callback for remote stream
 * @param callback - Function to call when remote stream is available
 * @returns Cleanup function to remove the callback
 */
export const onRemoteStream = (callback: (stream: MediaStream) => void): (() => void) => {
    onRemoteStreamCallback = callback;
    return () => {
        onRemoteStreamCallback = null;
    };
};

/**
 * Register callback for local stream
 * @param callback - Function to call when local stream is available
 * @returns Cleanup function to remove the callback
 */
export const onLocalStream = (callback: (stream: MediaStream) => void): (() => void) => {
    onLocalStreamCallback = callback;
    return () => {
        onLocalStreamCallback = null;
    };
};

/**
 * Register callback for incoming call
 * @param callback - Function to call when receiving an incoming call
 * @returns Cleanup function to remove the callback
 */
export const onIncomingCall = (callback: (callInfo: CallInfo) => void): (() => void) => {
    onIncomingCallCallback = callback;
    return () => {
        onIncomingCallCallback = null;
    };
};

/**
 * Register callback for call ended
 * @param callback - Function to call when call ends
 * @returns Cleanup function to remove the callback
 */
export const onCallEnded = (callback: () => void): (() => void) => {
    onCallEndedCallback = callback;
    return () => {
        onCallEndedCallback = null;
    };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Update call state and notify listeners
 * @param state - New call state
 */
const updateCallState = (state: WebRTCState): void => {
    if (currentCall) {
        currentCall.state = state;
        onStateChangeCallback?.(state);
        console.log(`[WebRTC] State changed to: ${state}`);
    }
};

/**
 * Clean up all WebRTC resources
 * Closes peer connection, stops media streams, resets state
 */
const cleanup = (): void => {
    console.log('[WebRTC] Cleaning up resources');

    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    // Stop local media stream tracks
    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
            console.log(`[WebRTC] Stopped local track: ${track.kind}`);
        });
        localStream = null;
    }

    // Clear remote stream
    remoteStream = null;

    // Reset state
    currentCall = null;
    iceCandidateQueue = [];
    remoteDescriptionSet = false;

    // Notify UI
    onCallEndedCallback?.();
};

// ============================================================================
// MEDIA STREAM MANAGEMENT
// ============================================================================

/**
 * Check if WebRTC APIs are available
 * @returns true if WebRTC is supported, false otherwise
 */
const isWebRTCSupported = (): boolean => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

/**
 * Get user's camera and microphone stream
 * Requests permission if not already granted
 * @param video - Enable video (default: true)
 * @param audio - Enable audio (default: true)
 * @returns Promise resolving to MediaStream
 */
const getLocalMediaStream = async (
    video: boolean = true,
    audio: boolean = true
): Promise<MediaStream> => {
    // Check if WebRTC APIs are available
    if (!isWebRTCSupported()) {
        console.error('[WebRTC] WebRTC APIs not available');
        throw new Error(
            'Video calling is not supported in this environment. ' +
            'Please use a modern web browser or enable WebRTC in your application settings.'
        );
    }

    try {
        console.log('[WebRTC] Requesting user media...');

        // Request access to camera and microphone
        const stream = await navigator.mediaDevices.getUserMedia({
            video: video ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user' // Use front camera on mobile
            } : false,
            audio: audio ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } : false
        });

        console.log('[WebRTC] User media stream acquired');
        return stream;
    } catch (error) {
        console.error('[WebRTC] Failed to get user media:', error);
        throw new Error('Failed to access camera/microphone. Please check permissions.');
    }
};

// ============================================================================
// PEER CONNECTION SETUP
// ============================================================================

/**
 * Create and configure WebRTC peer connection
 * Sets up event handlers for ICE candidates and remote stream
 * @returns RTCPeerConnection instance
 */
const createPeerConnection = (): RTCPeerConnection => {
    console.log('[WebRTC] Creating peer connection');

    // Create peer connection with ICE server configuration
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // ========================================================================
    // ICE CANDIDATE HANDLING
    // ========================================================================

    /**
     * Event: 'icecandidate'
     * Fired when local ICE candidate is generated
     * Send candidate to remote peer via signaling server (Socket.IO)
     * 
     * Note: We don't include 'from' field here - the server will automatically
     * add it based on socket.userId to ensure correct sender identification
     */
    pc.onicecandidate = (event) => {
        if (event.candidate && currentCall) {
            console.log('[WebRTC] Sending ICE candidate to peer');

            // Send ICE candidate to remote peer via Socket.IO
            const socket = getSocket();
            socket?.emit('webrtc-signal', {
                type: 'ice-candidate',
                to: currentCall.remoteUserId,  // Recipient's user ID
                conversationId: currentCall.conversationId,
                data: event.candidate.toJSON()
                // 'from' field omitted - server adds it as socket.userId for correct routing
            });
        }
    };

    /**
     * Event: 'iceconnectionstatechange'
     * Monitor ICE connection state for debugging
     */
    pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE connection state: ${pc.iceConnectionState}`);

        // Handle connection failure
        if (pc.iceConnectionState === 'failed') {
            console.error('[WebRTC] ICE connection failed');
            updateCallState('ended');
            cleanup();
        }

        // Handle disconnection
        if (pc.iceConnectionState === 'disconnected') {
            console.warn('[WebRTC] ICE connection disconnected');
        }

        // Handle successful connection
        if (pc.iceConnectionState === 'connected') {
            console.log('[WebRTC] ICE connection established');
            updateCallState('connected');
        }
    };

    // ========================================================================
    // REMOTE STREAM HANDLING
    // ========================================================================

    /**
     * Event: 'track'
     * Fired when remote peer adds a track (audio or video)
     * Collect all tracks into remote stream
     */
    pc.ontrack = (event) => {
        console.log(`[WebRTC] Received remote track: ${event.track.kind}`);

        // Create or get remote stream
        if (!remoteStream) {
            remoteStream = new MediaStream();
        }

        // Add track to remote stream
        remoteStream.addTrack(event.track);

        // Notify UI to display remote stream
        onRemoteStreamCallback?.(remoteStream);
    };

    // ========================================================================
    // CONNECTION STATE MONITORING
    // ========================================================================

    /**
     * Event: 'connectionstatechange'
     * Monitor overall connection state
     */
    pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state: ${pc.connectionState}`);

        // Handle disconnection or failure
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            updateCallState('ended');
            cleanup();
        }
    };

    return pc;
};

// ============================================================================
// SIGNALING HANDLERS
// ============================================================================

/**
 * Handle incoming WebRTC signaling messages from Socket.IO
 * Processes offer, answer, and ICE candidate messages
 * @param message - Signaling message
 */
export const handleSignalingMessage = async (message: SignalingMessage): Promise<void> => {
    console.log(`[WebRTC] Received signaling message: ${message.type}`);

    try {
        switch (message.type) {
            case 'offer':
                await handleOffer(message);
                break;
            case 'answer':
                await handleAnswer(message);
                break;
            case 'ice-candidate':
                await handleIceCandidate(message);
                break;
        }
    } catch (error) {
        console.error('[WebRTC] Error handling signaling message:', error);
    }
};

/**
 * Handle incoming call offer (SDP)
 * Creates peer connection, sets remote description, creates answer
 * @param message - Offer message
 */
const handleOffer = async (message: SignalingMessage): Promise<void> => {
    console.log('[WebRTC] Handling offer from peer');

    // Store the offer for later use when user accepts call
    const offerData = message.data as RTCSessionDescriptionInit;

    // Create call info for incoming call
    currentCall = {
        conversationId: message.conversationId,
        remoteUserId: message.from,
        remoteUserName: 'User', // Will be updated by UI
        direction: 'incoming',
        state: 'ringing'
    };

    // Store offer in currentCall context (we'll use this when accepting)
    (currentCall as any).pendingOffer = offerData;

    // Notify UI of incoming call
    onIncomingCallCallback?.(currentCall);
};

/**
 * Accept incoming call
 * Must be called after receiving offer
 */
export const acceptCall = async (): Promise<void> => {
    if (!currentCall) {
        throw new Error('No incoming call to accept');
    }

    const pendingOffer = (currentCall as any).pendingOffer;
    if (!pendingOffer) {
        throw new Error('No pending offer found');
    }

    try {
        console.log('[WebRTC] Accepting call');

        // Get local media stream
        localStream = await getLocalMediaStream();
        onLocalStreamCallback?.(localStream);

        // Create peer connection
        peerConnection = createPeerConnection();

        // Add local stream tracks to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection!.addTrack(track, localStream!);
            console.log(`[WebRTC] Added local track to peer connection: ${track.kind}`);
        });

        // Set remote description (the offer)
        await peerConnection.setRemoteDescription(new RTCSessionDescription(pendingOffer));
        remoteDescriptionSet = true;
        console.log('[WebRTC] Remote description (offer) set');

        // Create answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log('[WebRTC] Local description (answer) set');

        // Send answer to remote peer via Socket.IO
        const socket = getSocket();
        socket?.emit('webrtc-signal', {
            type: 'answer',
            to: currentCall.remoteUserId,
            conversationId: currentCall.conversationId,
            data: answer
        });

        console.log('[WebRTC] Answer sent to peer');

        // Process any queued ICE candidates
        await processIceCandidateQueue();

        // Note: State will be updated to 'connected' by ICE connection state change
        // Not updating here prevents duplicate state updates and timer issues
        // The call is truly 'connected' only when ICE negotiation succeeds
        
    } catch (error) {
        console.error('[WebRTC] Error accepting call:', error);
        cleanup();
        throw error;
    }
};

/**
 * Handle answer to our call offer
 * Sets remote description to complete connection
 * @param message - Answer message
 */
const handleAnswer = async (message: SignalingMessage): Promise<void> => {
    if (!peerConnection) {
        console.error('[WebRTC] No peer connection when receiving answer');
        return;
    }

    console.log('[WebRTC] Handling answer from peer');

    try {
        // Set remote description (answer SDP)
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(message.data as RTCSessionDescriptionInit)
        );

        remoteDescriptionSet = true;
        console.log('[WebRTC] Remote description set successfully');

        // Process queued ICE candidates
        await processIceCandidateQueue();
    } catch (error) {
        console.error('[WebRTC] Error setting remote description:', error);
    }
};

/**
 * Handle incoming ICE candidate
 * Adds candidate to peer connection or queues it
 * @param message - ICE candidate message
 */
const handleIceCandidate = async (message: SignalingMessage): Promise<void> => {
    const candidate = new RTCIceCandidate(message.data as RTCIceCandidateInit);

    // If remote description not set yet, queue the candidate
    if (!remoteDescriptionSet || !peerConnection) {
        console.log('[WebRTC] Queueing ICE candidate');
        iceCandidateQueue.push(message.data as RTCIceCandidateInit);
        return;
    }

    // Add ICE candidate to peer connection
    try {
        await peerConnection.addIceCandidate(candidate);
        console.log('[WebRTC] Added ICE candidate');
    } catch (error) {
        console.error('[WebRTC] Error adding ICE candidate:', error);
    }
};

/**
 * Process queued ICE candidates after remote description is set
 */
const processIceCandidateQueue = async (): Promise<void> => {
    if (iceCandidateQueue.length === 0 || !peerConnection) {
        return;
    }

    console.log(`[WebRTC] Processing ${iceCandidateQueue.length} queued ICE candidates`);

    for (const candidateData of iceCandidateQueue) {
        try {
            const candidate = new RTCIceCandidate(candidateData);
            await peerConnection.addIceCandidate(candidate);
        } catch (error) {
            console.error('[WebRTC] Error adding queued ICE candidate:', error);
        }
    }

    // Clear queue
    iceCandidateQueue = [];
};

// ============================================================================
// CALL INITIATION
// ============================================================================

/**
 * Start an outgoing video call
 * Gets media stream, creates offer, sends to peer via Socket.IO
 * @param conversationId - ID of the conversation to call
 * @param remoteUserId - ID of the user to call
 * @param remoteUserName - Name of the user to call
 * @param remoteUserAvatar - Avatar URL of the user to call
 */
export const startCall = async (
    conversationId: number,
    remoteUserId: number,
    remoteUserName: string,
    remoteUserAvatar?: string
): Promise<void> => {
    try {
        console.log(`[WebRTC] Starting call to user ${remoteUserId}`);

        // Create call info
        currentCall = {
            conversationId,
            remoteUserId,
            remoteUserName,
            remoteUserAvatar,
            direction: 'outgoing',
            state: 'calling'
        };

        updateCallState('calling');

        // Get local media stream
        localStream = await getLocalMediaStream();
        onLocalStreamCallback?.(localStream);

        // Create peer connection
        peerConnection = createPeerConnection();

        // Add local stream tracks to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection!.addTrack(track, localStream!);
            console.log(`[WebRTC] Added local track: ${track.kind}`);
        });

        // Create offer (SDP)
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });

        // Set local description
        await peerConnection.setLocalDescription(offer);
        console.log('[WebRTC] Local description (offer) set');

        // Send offer to remote peer via Socket.IO
        const socket = getSocket();
        socket?.emit('webrtc-signal', {
            type: 'offer',
            to: remoteUserId,
            conversationId,
            data: offer
        });

        console.log('[WebRTC] Offer sent to peer');
    } catch (error) {
        console.error('[WebRTC] Error starting call:', error);
        cleanup();
        throw error;
    }
};

// ============================================================================
// CALL CONTROL
// ============================================================================

/**
 * End the current call
 * Cleans up resources and notifies remote peer
 */
export const endCall = (): void => {
    if (!currentCall) {
        return;
    }

    console.log('[WebRTC] Ending call');

    // Notify remote peer via Socket.IO
    const socket = getSocket();
    socket?.emit('webrtc-call-end', {
        conversationId: currentCall.conversationId,
        to: currentCall.remoteUserId
    });

    updateCallState('ended');
    cleanup();
};

/**
 * Reject an incoming call
 * Notifies the caller that the call was rejected
 */
export const rejectCall = (): void => {
    if (!currentCall || currentCall.direction !== 'incoming') {
        return;
    }

    console.log('[WebRTC] Rejecting call');

    // Notify caller via Socket.IO
    const socket = getSocket();
    socket?.emit('webrtc-call-rejected', {
        conversationId: currentCall.conversationId,
        to: currentCall.remoteUserId
    });

    cleanup();
};

/**
 * Toggle video on/off during call
 * @param enabled - Enable or disable video
 */
export const toggleVideo = (enabled: boolean): void => {
    if (!localStream) {
        return;
    }

    localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
    });

    console.log(`[WebRTC] Video ${enabled ? 'enabled' : 'disabled'}`);
};

/**
 * Toggle audio on/off during call
 * @param enabled - Enable or disable audio
 */
export const toggleAudio = (enabled: boolean): void => {
    if (!localStream) {
        return;
    }

    localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
    });

    console.log(`[WebRTC] Audio ${enabled ? 'enabled' : 'disabled'}`);
};

// ============================================================================
// GETTERS
// ============================================================================

/**
 * Get current call information
 * @returns Current call info or null
 */
export const getCurrentCall = (): CallInfo | null => {
    return currentCall;
};

/**
 * Get local media stream
 * @returns Local stream or null
 */
export const getLocalStream = (): MediaStream | null => {
    return localStream;
};

/**
 * Get remote media stream
 * @returns Remote stream or null
 */
export const getRemoteStream = (): MediaStream | null => {
    return remoteStream;
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Check if WebRTC is supported in the current environment
 * @returns true if WebRTC APIs are available
 */
export const checkWebRTCSupport = (): boolean => {
    return isWebRTCSupported();
};

/**
 * Initialize WebRTC signaling listeners
 * Should be called once when app starts
 */
export const initializeWebRTC = (): void => {
    const socket = getSocket();

    if (!socket) {
        console.warn('[WebRTC] Cannot initialize: Socket not connected');
        return;
    }

    // Listen for WebRTC signaling messages
    socket.on('webrtc-signal', handleSignalingMessage);

    // Listen for call end from remote peer
    socket.on('webrtc-call-end', () => {
        console.log('[WebRTC] Call ended by remote peer');
        updateCallState('ended');
        cleanup();
    });

    // Listen for call rejection from remote peer
    socket.on('webrtc-call-rejected', () => {
        console.log('[WebRTC] Call rejected by remote peer');
        updateCallState('ended');
        cleanup();
    });

    console.log('[WebRTC] Initialized');
};
