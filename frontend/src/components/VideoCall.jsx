'use client';

import { useState, useEffect, useRef } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useDevices } from '@/hooks/useDevices';
import {
  Copy, Check, Users, Mic, MicOff, Video, VideoOff, PhoneOff,
  Settings, ChevronDown, X, ChevronUp,
} from 'lucide-react';

export default function VideoCall({ roomId, userName, onLeave }) {
  const {
    localStream,
    remoteStreams,
    remoteMediaState,
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
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
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
    <div className={`flex flex-col h-screen bg-[#000000] transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

      {/* Video Grid — takes all available space */}
      <div className="flex-1 p-2 sm:p-4 overflow-hidden">
        <div className={`grid gap-2 sm:gap-3 h-full auto-rows-fr ${
          participantCount === 1
            ? 'grid-cols-1 max-w-lg sm:max-w-3xl mx-auto'
            : participantCount === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : participantCount <= 4
            ? 'grid-cols-2'
            : 'grid-cols-2 lg:grid-cols-3'
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
          {Object.entries(remoteStreams).map(([peerId, stream]) => {
            const peerMedia = remoteMediaState[peerId];
            return (
              <VideoPlayer
                key={peerId}
                stream={stream}
                muted={false}
                label={nameMap[peerId] || `Peer ${peerId.slice(0, 6)}`}
                isAudioMuted={peerMedia ? !peerMedia.audio : false}
                isVideoOff={peerMedia ? !peerMedia.video : false}
                isLocal={false}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom bar — Room code left, participants center, controls right */}
      <div className="relative px-3 sm:px-5 py-3 sm:py-4">
        <div className="flex items-end justify-between gap-3">

          {/* Left: Room code + live indicator */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* Live pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[10px] font-satoshi font-bold uppercase tracking-wider">Live</span>
            </div>

            {/* Room code */}
            <button
              onClick={handleCopyId}
              className="group flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] hover:bg-white/[0.1] transition-all duration-300"
            >
              <span className="text-white/50 text-[10px] font-cabinet uppercase tracking-wider">Room</span>
              <span className="text-white/90 text-sm font-satoshi font-bold tracking-widest">{roomId}</span>
              {copied ? (
                <Check size={12} className="text-emerald-400 transition-all duration-300" />
              ) : (
                <Copy size={12} className="text-white/30 group-hover:text-white/60 transition-all duration-300" />
              )}
            </button>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-[20px] bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1]">
            {/* Mic toggle */}
            <button
              onClick={toggleAudio}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                isAudioMuted
                  ? 'bg-red-500/20 hover:bg-red-500/30'
                  : 'bg-white/[0.1] hover:bg-white/[0.15]'
              }`}
              title={isAudioMuted ? 'Unmute' : 'Mute'}
            >
              {isAudioMuted ? (
                <MicOff size={18} className="text-red-400" />
              ) : (
                <Mic size={18} className="text-white/80" />
              )}
            </button>

            {/* Video toggle */}
            <button
              onClick={toggleVideo}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                isVideoOff
                  ? 'bg-red-500/20 hover:bg-red-500/30'
                  : 'bg-white/[0.1] hover:bg-white/[0.15]'
              }`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? (
                <VideoOff size={18} className="text-red-400" />
              ) : (
                <Video size={18} className="text-white/80" />
              )}
            </button>

            {/* Device Settings */}
            <div className="relative" ref={deviceMenuRef}>
              <button
                onClick={() => { setShowDeviceMenu(!showDeviceMenu); setShowParticipants(false); }}
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  showDeviceMenu
                    ? 'bg-white/[0.18]'
                    : 'bg-white/[0.1] hover:bg-white/[0.15]'
                }`}
                title="Device settings"
              >
                <Settings size={18} className="text-white/80" />
              </button>

              {/* Device Selection Popover */}
              {showDeviceMenu && (
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-72 sm:w-80 rounded-2xl bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/[0.1] shadow-2xl z-50 overflow-hidden animate-[fade-in-up_0.2s_ease-out]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <span className="text-white/90 text-sm font-satoshi font-bold">Devices</span>
                    <button onClick={() => setShowDeviceMenu(false)} className="text-white/30 hover:text-white/60 transition-colors">
                      <X size={14} />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Microphone Select */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-white/50 text-xs font-cabinet font-medium">
                        <Mic size={12} />
                        Microphone
                      </label>
                      <div className="relative">
                        <select
                          value={selectedAudioId}
                          onChange={(e) => handleAudioDeviceChange(e.target.value)}
                          className="w-full appearance-none bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 pr-8 text-white/80 text-xs font-cabinet cursor-pointer hover:bg-white/[0.1] focus:outline-none focus:border-white/[0.2] transition-all duration-200"
                        >
                          {audioDevices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId} className="bg-[#1c1c1e] text-white">
                              {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                      </div>
                    </div>

                    {/* Camera Select */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-white/50 text-xs font-cabinet font-medium">
                        <Video size={12} />
                        Camera
                      </label>
                      <div className="relative">
                        <select
                          value={selectedVideoId}
                          onChange={(e) => handleVideoDeviceChange(e.target.value)}
                          className="w-full appearance-none bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 pr-8 text-white/80 text-xs font-cabinet cursor-pointer hover:bg-white/[0.1] focus:outline-none focus:border-white/[0.2] transition-all duration-200"
                        >
                          {videoDevices.map((d) => (
                            <option key={d.deviceId} value={d.deviceId} className="bg-[#1c1c1e] text-white">
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
            <div className="w-px h-7 bg-white/[0.12] mx-1" />

            {/* Leave */}
            <button
              onClick={handleLeave}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all duration-300 active:scale-[0.94]"
              title="Leave call"
            >
              <PhoneOff size={18} className="text-white" />
            </button>
          </div>

          {/* Right: Participants */}
          <div className="flex flex-col items-end gap-2 shrink-0" ref={participantsRef}>
            {/* Participants panel — expands upward */}
            {showParticipants && (
              <div className="w-64 sm:w-72 rounded-2xl bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/[0.1] shadow-2xl overflow-hidden animate-[fade-in-up_0.2s_ease-out]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <span className="text-white/90 text-sm font-satoshi font-bold">In this call</span>
                  <button onClick={() => setShowParticipants(false)} className="text-white/30 hover:text-white/60 transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto scrollbar-thin">
                  {/* You (local) */}
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs font-satoshi font-bold">
                        {(userName || 'Y')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white/90 text-sm font-cabinet font-medium block truncate">{userName || 'You'}</span>
                      <span className="text-white/30 text-[10px] font-cabinet">You</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isVideoOff && <VideoOff size={11} className="text-white/30" />}
                      {isAudioMuted && <MicOff size={11} className="text-red-400/60" />}
                    </div>
                  </div>

                  {/* Remote participants */}
                  {participants.map((p) => {
                    const peerMedia = remoteMediaState[p.id];
                    const peerAudioMuted = peerMedia ? !peerMedia.audio : false;
                    const peerVideoOff = peerMedia ? !peerMedia.video : false;
                    return (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center">
                          <span className="text-white/60 text-xs font-satoshi font-bold">
                            {(p.name || 'G')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-white/80 text-sm font-cabinet font-medium block truncate">{p.name || 'Guest'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {peerVideoOff && <VideoOff size={11} className="text-white/30" />}
                          {peerAudioMuted && <MicOff size={11} className="text-red-400/60" />}
                        </div>
                      </div>
                    );
                  })}

                  {participants.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <span className="text-white/20 text-xs font-cabinet">Waiting for others to join...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Participants toggle button */}
            <button
              onClick={() => { setShowParticipants(!showParticipants); setShowDeviceMenu(false); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all duration-300 ${
                showParticipants
                  ? 'bg-white/[0.12] border border-white/[0.15]'
                  : 'bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]'
              }`}
            >
              <Users size={14} className="text-white/60" />
              <span className="text-white/70 text-sm font-cabinet font-medium">{participantCount}</span>
              <ChevronUp size={12} className={`text-white/40 transition-transform duration-300 ${showParticipants ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
