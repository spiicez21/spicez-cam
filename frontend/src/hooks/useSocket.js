import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// Singleton socket — survives across component mounts/unmounts
let globalSocket = null;

function getSocket() {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      // Low-latency transport: skip long-polling, go straight to WebSocket
      transports: ['websocket'],
      // Faster reconnection
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      reconnectionAttempts: 10,
      // Reduce overhead
      upgrade: false,
      // Larger buffer for batched messages
      perMessageDeflate: false,
    });
  }
  return globalSocket;
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // If already connected, sync state
    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      // Do NOT disconnect — singleton stays alive
    };
  }, []);

  return {
    socket: getSocket(),
    isConnected,
  };
}
