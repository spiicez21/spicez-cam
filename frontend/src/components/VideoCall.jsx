'use client';

import { useState, useEffect, useRef } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useDevices } from '@/hooks/useDevices';
import {
  Copy, Check, Users, Mic, MicOff, Video, VideoOff, PhoneOff,
  Settings, ChevronDown, X, Circle,
} from 'lucide-react';

export default function VideoCall({ roomId, userName, onLeave }) {
  const {
    localStream,
    remoteStreams,
    participants,
    isAudioMuted,
    isVideoOff,
    toggleAudio,
    toggleVideo,
    switchDevice,
    cleanup,
  } = useWebRTC(roomId);

  const {
    audioDevices,
    videoDevices,
    selectedAudioId,
    selectedVideoId,
    setSelectedAudioId,
    setSelectedVideoId,
  } = useDevices();

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const deviceMenuRef = useRef(null);
  const participantsRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close popups on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (deviceMenuRef.current && !deviceMenuRef.current.contains(e.target)) {
        setShowDeviceMenu(false);
      }
      if (participantsRef.current && !participantsRef.current.contains(e.target)) {
        setShowParticipants(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
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

  const handleAudioDeviceChange = (deviceId) => {
    setSelectedAudioId(deviceId);
    switchDevice('audio', deviceId);
  };

  const handleVideoDeviceChange = (deviceId) => {
    setSelectedVideoId(deviceId);
    switchDevice('video', deviceId);
  };

  const participantCount = Object.keys(remoteStreams).length + 1;

  // Build name lookup from participants array
  const nameMap = {};
  participants.forEach((p) => { nameMap[p.id] = p.name; });

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
          {/* Participants toggle */}
          <div className="relative" ref={participantsRef}>
            <button
              onClick={() => { setShowParticipants(!showParticipants); setShowDeviceMenu(false); }}
              className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all duration-300 ${
                showParticipants
                  ? 'bg-[#556B2F]/20 border border-[#556B2F]/30'
                  : 'bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
            >
              <Users size={12} className={showParticipants ? 'text-[#6B8E3D]' : 'text-white/40'} />
              <span className={`text-xs font-cabinet ${showParticipants ? 'text-[#6B8E3D]' : 'text-white/40'}`}>{participantCount}</span>
            </button>

            {/* Participants Panel */}
            {showParticipants && (
              <div className="absolute right-0 top-full mt-2 w-64 sm:w-72 rounded-xl bg-[#111]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl z-50 overflow-hidden animate-[fade-in-up_0.2s_ease-out]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <span className="text-white/80 text-xs font-satoshi font-bold uppercase tracking-wider">Participants</span>
                  <button onClick={() => setShowParticipants(false)} className="text-white/30 hover:text-white/60 transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto scrollbar-thin">
                  {/* You (local) */}
                  <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[#556B2F]/20 border border-[#556B2F]/30 flex items-center justify-center">
                        <span className="text-[#6B8E3D] text-xs font-satoshi font-bold">
                          {(userName || 'Y')[0].toUpperCase()}
                        </span>
                      </div>
                      <Circle size={8} fill="#6B8E3D" className="text-[#6B8E3D] absolute -bottom-0.5 -right-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white/80 text-sm font-cabinet font-medium block truncate">{userName || 'You'}</span>
                      <span className="text-white/30 text-[10px] font-cabinet">You</span>
                    </div>
                    {isAudioMuted && <MicOff size={12} className="text-red-400/60 shrink-0" />}
                  </div>

                  {/* Remote participants */}
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
                          <span className="text-white/60 text-xs font-satoshi font-bold">
                            {(p.name || 'G')[0].toUpperCase()}
                          </span>
                        </div>
                        <Circle size={8} fill="#6B8E3D" className="text-[#6B8E3D] absolute -bottom-0.5 -right-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-white/80 text-sm font-cabinet font-medium block truncate">{p.name || 'Guest'}</span>
                      </div>
                    </div>
                  ))}

                  {participants.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <span className="text-white/20 text-xs font-cabinet">No one else has joined yet</span>
                    </div>
                  )}
                </div>
              </div>
            )}
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
              label={nameMap[peerId] || `Peer ${peerId.slice(0, 6)}`}
              isLocal={false}
            />
          ))}
        </div>
      </div>

      {/* Controls - Floating bar Apple Music style */}
      <div className="flex items-center justify-center px-3 sm:px-6 py-3 sm:py-5">
        <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.06] shadow-[0_-4px_32px_rgba(0,0,0,0.3)] relative">
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

          {/* Device Settings */}
          <div className="relative" ref={deviceMenuRef}>
            <button
              onClick={() => { setShowDeviceMenu(!showDeviceMenu); setShowParticipants(false); }}
              className={`group relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 ${
                showDeviceMenu
                  ? 'bg-[#556B2F]/15 border border-[#556B2F]/20'
                  : 'bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]'
              }`}
              title="Device settings"
            >
              <Settings size={18} className={showDeviceMenu ? 'text-[#6B8E3D]' : 'text-white/70'} />
            </button>

            {/* Device Selection Popover */}
            {showDeviceMenu && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 sm:w-80 rounded-xl bg-[#111]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl z-50 overflow-hidden animate-[fade-in-up_0.2s_ease-out]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <span className="text-white/80 text-xs font-satoshi font-bold uppercase tracking-wider">Devices</span>
                  <button onClick={() => setShowDeviceMenu(false)} className="text-white/30 hover:text-white/60 transition-colors">
                    <X size={14} />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Microphone Select */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-white/40 text-[10px] font-satoshi font-bold uppercase tracking-wider">
                      <Mic size={10} />
                      Microphone
                    </label>
                    <div className="relative">
                      <select
                        value={selectedAudioId}
                        onChange={(e) => handleAudioDeviceChange(e.target.value)}
                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 pr-8 text-white/80 text-xs font-cabinet cursor-pointer hover:bg-white/[0.06] focus:outline-none focus:border-[#556B2F]/40 transition-all duration-200"
                      >
                        {audioDevices.map((d) => (
                          <option key={d.deviceId} value={d.deviceId} className="bg-[#1a1a1a] text-white">
                            {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    </div>
                  </div>

                  {/* Camera Select */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-white/40 text-[10px] font-satoshi font-bold uppercase tracking-wider">
                      <Video size={10} />
                      Camera
                    </label>
                    <div className="relative">
                      <select
                        value={selectedVideoId}
                        onChange={(e) => handleVideoDeviceChange(e.target.value)}
                        className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 pr-8 text-white/80 text-xs font-cabinet cursor-pointer hover:bg-white/[0.06] focus:outline-none focus:border-[#556B2F]/40 transition-all duration-200"
                      >
                        {videoDevices.map((d) => (
                          <option key={d.deviceId} value={d.deviceId} className="bg-[#1a1a1a] text-white">
                            {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

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
