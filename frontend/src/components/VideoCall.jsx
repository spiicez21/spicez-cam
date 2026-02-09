'use client';

import { useState, useEffect } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Copy, Check, Users, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

export default function VideoCall({ roomId, userName, onLeave }) {
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
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 bg-white/[0.02] backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#556B2F]/15 border border-[#556B2F]/20 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6B8E3D] animate-pulse" />
            <span className="text-[#6B8E3D] text-[10px] sm:text-xs font-satoshi font-bold uppercase tracking-wider">Live</span>
          </div>

          {/* Room ID pill */}
          <button
            onClick={handleCopyId}
            className="group flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all duration-300 min-w-0"
          >
            <span className="text-white/60 text-xs sm:text-sm font-cabinet font-medium tracking-wide truncate">{roomId}</span>
            {copied ? (
              <Check size={14} className="text-[#6B8E3D] transition-all duration-300 shrink-0" />
            ) : (
              <Copy size={14} className="text-white/30 group-hover:text-white/60 transition-all duration-300 shrink-0" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/[0.04]">
            <Users size={12} className="text-white/40" />
            <span className="text-white/40 text-xs font-cabinet">{participantCount}</span>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-2 sm:p-3 overflow-auto">
        <div className={`grid gap-2 sm:gap-3 h-full ${
          participantCount === 1
            ? 'grid-cols-1 max-w-sm sm:max-w-2xl mx-auto'
            : participantCount === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {/* Local Video */}
          <VideoPlayer
            stream={localStream}
            muted={true}
            label={userName || 'You'}
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
      <div className="flex items-center justify-center px-3 sm:px-6 py-3 sm:py-5">
        <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.06] shadow-[0_-4px_32px_rgba(0,0,0,0.3)]">
          {/* Mic toggle */}
          <button
            onClick={toggleAudio}
            className={`group relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 ${
              isAudioMuted
                ? 'bg-red-500/15 border border-red-500/20 hover:bg-red-500/25'
                : 'bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]'
            }`}
            title={isAudioMuted ? 'Unmute' : 'Mute'}
          >
            {isAudioMuted ? (
              <MicOff size={18} className="text-red-400" />
            ) : (
              <Mic size={18} className="text-white/70" />
            )}
          </button>

          {/* Video toggle */}
          <button
            onClick={toggleVideo}
            className={`group relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 ${
              isVideoOff
                ? 'bg-red-500/15 border border-red-500/20 hover:bg-red-500/25'
                : 'bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? (
              <VideoOff size={18} className="text-red-400" />
            ) : (
              <Video size={18} className="text-white/70" />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-6 sm:h-8 bg-white/[0.08] mx-0.5 sm:mx-1" />

          {/* Leave */}
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 font-bold text-xs sm:text-sm font-satoshi transition-all duration-300 active:scale-[0.96]"
          >
            <PhoneOff size={14} />
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
