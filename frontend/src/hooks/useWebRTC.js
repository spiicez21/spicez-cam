import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { createPeerConnection } from '@/utils/webrtc';

export function useWebRTC(roomId) {
  const { socket } = useSocket();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participants, setParticipants] = useState([]); // { id, name }
  const peersRef = useRef({});

  // Initialize local media with optional device IDs
  const initMedia = useCallback(async (audioDeviceId, videoDeviceId) => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          ...(videoDeviceId ? { deviceId: { exact: videoDeviceId } } : {}),
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          ...(audioDeviceId ? { deviceId: { exact: audioDeviceId } } : {}),
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (err) {
      console.error('Failed to get local stream:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    const start = async () => {
      const stream = await initMedia();
      if (stream) setLocalStream(stream);
    };
    start();

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
    socket.on('user-joined', async ({ userId, userName }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.id === userId)) return prev;
        return [...prev, { id: userId, name: userName || 'Guest' }];
      });

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
      // Ensure participant entry exists for the caller
      setParticipants((prev) => {
        if (prev.some((p) => p.id === from)) return prev;
        return [...prev, { id: from, name: 'Guest' }];
      });

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
      setParticipants((prev) => prev.filter((p) => p.id !== userId));
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
    setParticipants([]);
  }, [localStream]);

  // Switch a single device (audio or video) without dropping peers
  const switchDevice = useCallback(async (kind, deviceId) => {
    if (!localStream) return;

    try {
      const isAudio = kind === 'audio';
      const constraints = isAudio
        ? { audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true } }
        : { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } };

      const tempStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = isAudio ? tempStream.getAudioTracks()[0] : tempStream.getVideoTracks()[0];

      if (!newTrack) return;

      // Replace track in the local stream
      const oldTrack = isAudio ? localStream.getAudioTracks()[0] : localStream.getVideoTracks()[0];
      if (oldTrack) {
        localStream.removeTrack(oldTrack);
        oldTrack.stop();
      }
      localStream.addTrack(newTrack);

      // Preserve mute/off state
      if (isAudio) newTrack.enabled = !isAudioMuted;
      else newTrack.enabled = !isVideoOff;

      // Replace track in all peer connections
      Object.values(peersRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) =>
          s.track && s.track.kind === (isAudio ? 'audio' : 'video')
        );
        if (sender) sender.replaceTrack(newTrack);
      });

      // Force re-render by updating stream reference
      setLocalStream(localStream);
    } catch (err) {
      console.error(`Failed to switch ${kind} device:`, err);
    }
  }, [localStream, isAudioMuted, isVideoOff]);

  return {
    localStream,
    remoteStreams,
    participants,
    isAudioMuted,
    isVideoOff,
    toggleAudio,
    toggleVideo,
    switchDevice,
    cleanup,
  };
}
