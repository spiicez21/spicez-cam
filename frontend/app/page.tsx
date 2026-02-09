'use client';

import { useState } from 'react';
import Landing from '@/components/Landing';
import CreateRoom from '@/components/CreateRoom';
import JoinRoom from '@/components/JoinRoom';
import VideoCall from '@/components/VideoCall';

type View = 'landing' | 'create' | 'join' | 'call';

export default function Home() {
  const [view, setView] = useState<View>('landing');
  const [roomId, setRoomId] = useState<string | null>(null);

  const handleRoomCreated = (id: string) => {
    setRoomId(id);
    setView('call');
  };

  const handleRoomJoined = (id: string) => {
    setRoomId(id);
    setView('call');
  };

  const handleLeave = () => {
    setRoomId(null);
    setView('landing');
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {view === 'landing' && (
        <Landing
          onCreateRoom={() => setView('create')}
          onJoinRoom={() => setView('join')}
        />
      )}
      {view === 'create' && (
        <CreateRoom
          onRoomCreated={handleRoomCreated}
          onBack={() => setView('landing')}
        />
      )}
      {view === 'join' && (
        <JoinRoom
          onRoomJoined={handleRoomJoined}
          onBack={() => setView('landing')}
        />
      )}
      {view === 'call' && roomId && (
        <VideoCall roomId={roomId} onLeave={handleLeave} />
      )}
    </main>
  );
}
