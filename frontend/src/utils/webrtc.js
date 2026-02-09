const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Get local media stream (camera + microphone)
 */
export async function getLocalStream() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user',
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
  return stream;
}

/**
 * Create a new RTCPeerConnection and wire up tracks + ICE candidates
 */
export function createPeerConnection(peerId, socket, localStream, onRemoteStream) {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  // Add local tracks to connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Handle incoming remote tracks
  pc.ontrack = (event) => {
    const [remoteStream] = event.streams;
    if (remoteStream) {
      onRemoteStream(remoteStream);
    }
  };

  // Send ICE candidates to remote peer
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        to: peerId,
        candidate: event.candidate,
      });
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`ICE state (${peerId}):`, pc.iceConnectionState);
  };

  return pc;
}
