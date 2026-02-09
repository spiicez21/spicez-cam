import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { createPeerConnection, getLocalStream } from '@/utils/webrtc';

export function useWebRTC(roomId) {
  const { socket } = useSocket();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const peersRef = useRef({});

  // Initialize local media
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await getLocalStream();
        setLocalStream(stream);
      } catch (err) {
        console.error('Failed to get local stream:', err);
      }
    };
    initMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle signaling
  useEffect(() => {
    if (!socket || !localStream) return;

    // When a new user joins, create an offer
    socket.on('user-joined', async ({ userId }) => {
      const pc = createPeerConnection(userId, socket, localStream, (stream) => {
        setRemoteStreams((prev) => ({ ...prev, [userId]: stream }));
      });
      peersRef.current[userId] = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { to: userId, offer });
    });

    // Receive an offer and send back an answer
    socket.on('offer', async ({ from, offer }) => {
      const pc = createPeerConnection(from, socket, localStream, (stream) => {
        setRemoteStreams((prev) => ({ ...prev, [from]: stream }));
      });
      peersRef.current[from] = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: from, answer });
    });

    // Receive an answer
    socket.on('answer', async ({ from, answer }) => {
      const pc = peersRef.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Receive ICE candidate
    socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // User left
    socket.on('user-left', ({ userId }) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
      }
      setRemoteStreams((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    });

    // Room closed
    socket.on('room-closed', () => {
      cleanup();
    });

    return () => {
      socket.off('user-joined');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-left');
      socket.off('room-closed');
    };
  }, [socket, localStream]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
        socket?.emit('toggle-media', { roomId, type: 'audio', enabled: audioTrack.enabled });
      }
    }
  }, [localStream, socket, roomId]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
        socket?.emit('toggle-media', { roomId, type: 'video', enabled: videoTrack.enabled });
      }
    }
  }, [localStream, socket, roomId]);

  const cleanup = useCallback(() => {
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    setRemoteStreams({});
  }, [localStream]);

  return {
    localStream,
    remoteStreams,
    isAudioMuted,
    isVideoOff,
    toggleAudio,
    toggleVideo,
    cleanup,
  };
}
