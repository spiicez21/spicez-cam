'use client';

import { useState } from 'react';
import Landing from '@/components/Landing';
import CreateRoom from '@/components/CreateRoom';
import JoinRoom from '@/components/JoinRoom';
import PreJoinLobby from '@/components/PreJoinLobby';
import VideoCall from '@/components/VideoCall';

type View = 'landing' | 'create' | 'join' | 'lobby' | 'call';

interface MediaPrefs {
  initialAudioMuted: boolean;
  initialVideoOff: boolean;
}

export default function Home() {
  const [view, setView] = useState<View>('landing');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [mediaPrefs, setMediaPrefs] = useState<MediaPrefs>({ initialAudioMuted: false, initialVideoOff: false });

  const handleRoomCreated = (id: string, name: string) => {
    setRoomId(id);
    setUserName(name);
    setView('lobby');
  };

  const handleRoomJoined = (id: string, name: string) => {
    setRoomId(id);
    setUserName(name);
    setView('lobby');
  };

  const handleJoinCall = (prefs: MediaPrefs) => {
    setMediaPrefs(prefs);
    setView('call');
  };

  const handleLeave = () => {
    setRoomId(null);
    setUserName('');
    setMediaPrefs({ initialAudioMuted: false, initialVideoOff: false });
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
      {view === 'lobby' && roomId && (
        <PreJoinLobby
          userName={userName}
          onJoinCall={handleJoinCall}
        />
      )}
      {view === 'call' && roomId && (
        <VideoCall
          roomId={roomId}
          userName={userName}
          onLeave={handleLeave}
          initialAudioMuted={mediaPrefs.initialAudioMuted}
          initialVideoOff={mediaPrefs.initialVideoOff}
        />
      )}
    </main>
  );
}
