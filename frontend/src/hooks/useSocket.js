import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// Singleton socket — survives across component mounts/unmounts
let globalSocket = null;

function getSocket() {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL);
  }
  return globalSocket;
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setIsConnected(true);
      console.log('Connected to signaling server');
    };

    const onDisconnect = () => {
      setIsConnected(false);
      console.log('Disconnected from signaling server');
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
