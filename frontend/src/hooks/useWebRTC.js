import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { createPeerConnection, createLowLatencyOffer, createLowLatencyAnswer } from '@/utils/webrtc';

export function useWebRTC(roomId, { initialAudioMuted = false, initialVideoOff = false } = {}) {
  const { socket } = useSocket();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isAudioMuted, setIsAudioMuted] = useState(initialAudioMuted);
  const [isVideoOff, setIsVideoOff] = useState(initialVideoOff);
  const [participants, setParticipants] = useState([]); // { id, name }
  const [remoteMediaState, setRemoteMediaState] = useState({}); // { [userId]: { audio: bool, video: bool } }
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteScreenState, setRemoteScreenState] = useState({}); // { [userId]: bool }
  const [remoteScreenStreams, setRemoteScreenStreams] = useState({}); // { [userId]: MediaStream }
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenSendersRef = useRef({}); // { [peerId]: [sender, sender] } — screen track senders per peer
  const initedRef = useRef(false);

  // Initialize local media with optional device IDs
  const initMedia = useCallback(async (audioDeviceId, videoDeviceId) => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user',
          ...(videoDeviceId ? { deviceId: { exact: videoDeviceId } } : {}),
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Lower latency audio
          latency: 0.01,
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

  // Keep ref in sync with state
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    if (!socket || !roomId || initedRef.current) return;
    initedRef.current = true;

    const start = async () => {
      const stream = await initMedia();
      if (stream) {
        // Apply initial media preferences from the pre-join lobby
        if (initialAudioMuted) {
          const audioTrack = stream.getAudioTracks()[0];
          if (audioTrack) audioTrack.enabled = false;
        }
        if (initialVideoOff) {
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) videoTrack.enabled = false;
        }
        // Update ref immediately so peer connections can use it right away
        localStreamRef.current = stream;
        setLocalStream(stream);
        // Broadcast initial media state
        if (initialAudioMuted) {
          socket.emit('toggle-media', { roomId, type: 'audio', enabled: false });
        }
        if (initialVideoOff) {
          socket.emit('toggle-media', { roomId, type: 'video', enabled: false });
        }
        // Tell the room we're ready so existing participants send offers
        socket.emit('ready', { roomId });
      }
    };
    start();

    return () => {
      // Use ref to avoid stale closure over null
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      initedRef.current = false;
    };
  }, [socket, roomId]);

  // Wait for local stream to be available (handles race condition)
  const waitForStream = useCallback(() => {
    return new Promise((resolve) => {
      const check = () => {
        if (localStreamRef.current) return resolve(localStreamRef.current);
        setTimeout(check, 50);
      };
      check();
    });
  }, []);

  // Handle signaling — set up listeners immediately, don't wait for localStream
  useEffect(() => {
    if (!socket) return;

    // When a new user joins, create an offer
    socket.on('user-joined', async ({ userId, userName }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.id === userId)) return prev;
        return [...prev, { id: userId, name: userName || 'Guest' }];
      });

      // Close any stale peer connection for this user
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
      }

      const stream = localStreamRef.current || await waitForStream();
      const pc = createPeerConnection(userId, socket, stream,
        (remoteStream) => {
          setRemoteStreams((prev) => ({ ...prev, [userId]: remoteStream }));
        },
        (remoteScreenStream) => {
          setRemoteScreenStreams((prev) => ({ ...prev, [userId]: remoteScreenStream }));
        },
      );
      peersRef.current[userId] = pc;

      // If we're currently screen sharing, add screen tracks to the new peer
      if (screenStreamRef.current) {
        const sVideo = screenStreamRef.current.getVideoTracks()[0];
        const sAudio = screenStreamRef.current.getAudioTracks()[0];
        const senders = [];
        if (sVideo) try { senders.push(pc.addTrack(sVideo, screenStreamRef.current)); } catch {}
        if (sAudio) try { senders.push(pc.addTrack(sAudio, screenStreamRef.current)); } catch {}
        if (senders.length) screenSendersRef.current[userId] = senders;
      }

      // Use low-latency offer (codec preferences + SDP tweaks)
      const offer = await createLowLatencyOffer(pc);
      socket.emit('offer', { to: userId, offer });
    });

    // Receive an offer and send back an answer (also handles renegotiation)
    socket.on('offer', async ({ from, offer, userName }) => {
      // Ensure participant entry exists for the caller
      setParticipants((prev) => {
        const existing = prev.find((p) => p.id === from);
        if (existing) {
          if (userName && existing.name === 'Guest') {
            return prev.map((p) => p.id === from ? { ...p, name: userName } : p);
          }
          return prev;
        }
        return [...prev, { id: from, name: userName || 'Guest' }];
      });

      const existingPc = peersRef.current[from];

      // --- Renegotiation path: reuse existing peer connection ---
      if (existingPc && existingPc.connectionState !== 'closed' && existingPc.signalingState !== 'closed') {
        try {
          // Handle glare: if we also have a pending local offer, one side must rollback.
          // The peer with the lexicographically smaller socket id is "polite" and rolls back.
          if (existingPc.signalingState === 'have-local-offer') {
            const isPolite = socket.id < from;
            if (isPolite) {
              await existingPc.setLocalDescription({ type: 'rollback' });
            } else {
              // Impolite side ignores the incoming offer; our offer takes priority
              return;
            }
          }
          const answer = await createLowLatencyAnswer(existingPc, offer);
          socket.emit('answer', { to: from, answer });
        } catch (err) {
          console.error('Renegotiation answer failed:', err);
        }
        return;
      }

      // --- New connection path ---
      if (existingPc) {
        existingPc.close();
        delete peersRef.current[from];
      }

      const stream = localStreamRef.current || await waitForStream();
      const pc = createPeerConnection(from, socket, stream,
        (remoteStream) => {
          setRemoteStreams((prev) => ({ ...prev, [from]: remoteStream }));
        },
        (remoteScreenStream) => {
          setRemoteScreenStreams((prev) => ({ ...prev, [from]: remoteScreenStream }));
        },
      );
      peersRef.current[from] = pc;

      // If we're currently screen sharing, add screen tracks to the new peer
      if (screenStreamRef.current) {
        const sVideo = screenStreamRef.current.getVideoTracks()[0];
        const sAudio = screenStreamRef.current.getAudioTracks()[0];
        const senders = [];
        if (sVideo) try { senders.push(pc.addTrack(sVideo, screenStreamRef.current)); } catch {}
        if (sAudio) try { senders.push(pc.addTrack(sAudio, screenStreamRef.current)); } catch {}
        if (senders.length) screenSendersRef.current[from] = senders;
      }

      // Use low-latency answer (codec preferences + SDP tweaks)
      const answer = await createLowLatencyAnswer(pc, offer);
      socket.emit('answer', { to: from, answer });
    });

    // Receive an answer
    socket.on('answer', async ({ from, answer }) => {
      const pc = peersRef.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Receive single ICE candidate (backwards compat)
    socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // Receive batched ICE candidates (low-latency path)
    socket.on('ice-candidates', async ({ from, candidates }) => {
      const pc = peersRef.current[from];
      if (pc && Array.isArray(candidates)) {
        // Add all candidates in parallel for fastest setup
        await Promise.all(
          candidates.map((c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}))
        );
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
      setRemoteMediaState((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      setRemoteScreenState((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      setRemoteScreenStreams((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      setParticipants((prev) => prev.filter((p) => p.id !== userId));
    });

    // Remote user screen share state
    socket.on('user-screen-share', ({ userId, sharing }) => {
      setRemoteScreenState((prev) => {
        if (!sharing) {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        }
        return { ...prev, [userId]: true };
      });
      // Clean up remote screen stream when sharing stops
      if (!sharing) {
        setRemoteScreenStreams((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
      }
    });

    // Remote user toggled their media
    socket.on('user-toggle-media', ({ userId, type, enabled }) => {
      setRemoteMediaState((prev) => ({
        ...prev,
        [userId]: {
          ...(prev[userId] || { audio: true, video: true }),
          [type]: enabled,
        },
      }));
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
      socket.off('ice-candidates');
      socket.off('user-left');
      socket.off('user-toggle-media');
      socket.off('user-screen-share');
      socket.off('room-closed');
    };
  }, [socket]);

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

  // Start screen sharing — adds screen tracks alongside camera (both visible simultaneously)
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', frameRate: { ideal: 30 } },
        audio: true, // capture system/tab audio
      });

      const screenVideoTrack = stream.getVideoTracks()[0];
      const screenAudioTrack = stream.getAudioTracks()[0];

      if (!screenVideoTrack) return;

      // Add screen tracks to all existing peer connections and renegotiate
      for (const [peerId, pc] of Object.entries(peersRef.current)) {
        const senders = [];
        try {
          senders.push(pc.addTrack(screenVideoTrack, stream));
        } catch {}
        if (screenAudioTrack) {
          try {
            senders.push(pc.addTrack(screenAudioTrack, stream));
          } catch {}
        }
        screenSendersRef.current[peerId] = senders;

        // Renegotiate so the remote peer learns about the new tracks
        try {
          const offer = await createLowLatencyOffer(pc);
          socket?.emit('offer', { to: peerId, offer });
        } catch (err) {
          console.error('Screen share renegotiation failed for peer:', peerId, err);
        }
      }

      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);
      socket?.emit('screen-share-started', { roomId });

      // Auto-stop when user clicks browser's "Stop sharing" button
      screenVideoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      // User cancelled the picker — not an error
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        console.error('Screen share failed:', err);
      }
    }
  }, [socket, roomId]);

  // Stop screen sharing — remove screen tracks, camera stays as-is
  const stopScreenShare = useCallback(() => {
    // Remove screen senders from all peer connections and renegotiate
    for (const [peerId, senders] of Object.entries(screenSendersRef.current)) {
      const pc = peersRef.current[peerId];
      if (pc) {
        senders.forEach((sender) => {
          try { pc.removeTrack(sender); } catch {}
        });
        // Renegotiate so remote peer drops the screen tracks
        createLowLatencyOffer(pc)
          .then((offer) => socket?.emit('offer', { to: peerId, offer }))
          .catch(() => {});
      }
    }
    screenSendersRef.current = {};

    // Stop all screen tracks
    const stream = screenStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);
    socket?.emit('screen-share-stopped', { roomId });
  }, [socket, roomId]);

  const cleanup = useCallback(() => {
    // Stop screen share if active
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    screenSendersRef.current = {};
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    // Use ref so cleanup always sees the current stream
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStreams({});
    setParticipants([]);
  }, []);

  // Switch a single device (audio or video) without dropping peers
  const switchDevice = useCallback(async (kind, deviceId) => {
    if (!localStream) return;

    try {
      const isAudio = kind === 'audio';
      const constraints = isAudio
        ? { audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true, latency: 0.01 } }
        : { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } };

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
    remoteMediaState,
    remoteScreenState,
    remoteScreenStreams,
    participants,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    screenStream,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchDevice,
    cleanup,
  };
}
