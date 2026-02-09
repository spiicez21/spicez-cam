'use client';

import { useEffect } from 'react';
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

  const handleLeave = () => {
    cleanup();
    onLeave();
  };

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">
            <span className="text-[#556B2F]">Room:</span> {roomId}
          </h2>
          <button
            onClick={() => navigator.clipboard.writeText(roomId)}
            className="text-white/40 hover:text-white text-sm transition-colors"
          >
            Copy ID
          </button>
        </div>
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <div className="w-2 h-2 rounded-full bg-[#556B2F] animate-pulse" />
          {Object.keys(remoteStreams).length + 1} participant(s)
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
          {/* Local Video */}
          <VideoPlayer
            stream={localStream}
            muted={true}
            label="You"
            isAudioMuted={isAudioMuted}
            isVideoOff={isVideoOff}
          />

          {/* Remote Videos */}
          {Object.entries(remoteStreams).map(([peerId, stream]) => (
            <VideoPlayer
              key={peerId}
              stream={stream}
              muted={false}
              label={`Peer ${peerId.slice(0, 6)}`}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-6 py-6 border-t border-white/10">
        <button
          onClick={toggleAudio}
          className={`p-4 rounded-full transition-all duration-300 ${
            isAudioMuted
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
          }`}
        >
          {isAudioMuted ? '🔇' : '🎤'}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all duration-300 ${
            isVideoOff
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
          }`}
        >
          {isVideoOff ? '📷' : '🎥'}
        </button>

        <button
          onClick={handleLeave}
          className="px-8 py-4 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 font-semibold transition-all duration-300"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
