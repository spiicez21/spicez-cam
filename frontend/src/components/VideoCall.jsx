'use client';

import { useState, useEffect } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import { useWebRTC } from '@/hooks/useWebRTC';

export default function VideoCall({ roomId, onLeave }) {
  const {
    localStream,
    remoteStreams,
    isAudioMuted,
    isVideoOff,
    toggleAudio,
    toggleVideo,
    cleanup,
  } = useWebRTC(roomId);

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLeave = () => {
    cleanup();
    onLeave();
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const participantCount = Object.keys(remoteStreams).length + 1;

  return (
    <div className={`flex flex-col h-screen bg-[#0A0A0A] transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header - Apple Music style top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white/[0.02] backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#556B2F]/15 border border-[#556B2F]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6B8E3D] animate-pulse" />
            <span className="text-[#6B8E3D] text-xs font-satoshi font-bold uppercase tracking-wider">Live</span>
          </div>

          {/* Room ID pill */}
          <button
            onClick={handleCopyId}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all duration-300"
          >
            <span className="text-white/50 text-xs font-cabinet">{roomId}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`text-white/30 group-hover:text-white/60 transition-all duration-300 ${copied ? 'text-[#6B8E3D]' : ''}`}>
              {copied ? (
                <polyline points="20 6 9 17 4 12" />
              ) : (
                <>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </>
              )}
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-white/40">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="text-white/40 text-xs font-cabinet">{participantCount}</span>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-3 overflow-auto">
        <div className={`grid gap-3 h-full ${
          participantCount === 1
            ? 'grid-cols-1 max-w-2xl mx-auto'
            : participantCount === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {/* Local Video */}
          <VideoPlayer
            stream={localStream}
            muted={true}
            label="You"
            isAudioMuted={isAudioMuted}
            isVideoOff={isVideoOff}
            isLocal={true}
          />

          {/* Remote Videos */}
          {Object.entries(remoteStreams).map(([peerId, stream]) => (
            <VideoPlayer
              key={peerId}
              stream={stream}
              muted={false}
              label={`Peer ${peerId.slice(0, 6)}`}
              isLocal={false}
            />
          ))}
        </div>
      </div>

      {/* Controls - Floating bar Apple Music style */}
      <div className="flex items-center justify-center px-6 py-5">
        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.06] shadow-[0_-4px_32px_rgba(0,0,0,0.3)]">
          {/* Mic toggle */}
          <button
            onClick={toggleAudio}
            className={`group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
              isAudioMuted
                ? 'bg-red-500/15 border border-red-500/20 hover:bg-red-500/25'
                : 'bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]'
            }`}
            title={isAudioMuted ? 'Unmute' : 'Mute'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={isAudioMuted ? 'text-red-400' : 'text-white/70'}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
              {isAudioMuted && <line x1="1" y1="1" x2="23" y2="23" className="text-red-400" />}
            </svg>
          </button>

          {/* Video toggle */}
          <button
            onClick={toggleVideo}
            className={`group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
              isVideoOff
                ? 'bg-red-500/15 border border-red-500/20 hover:bg-red-500/25'
                : 'bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={isVideoOff ? 'text-red-400' : 'text-white/70'}>
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              {isVideoOff && <line x1="1" y1="1" x2="23" y2="23" className="text-red-400" />}
            </svg>
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-white/[0.08] mx-1" />

          {/* Leave */}
          <button
            onClick={handleLeave}
            className="px-6 py-3 rounded-xl bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 font-bold text-sm font-satoshi transition-all duration-300 active:scale-[0.96]"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
