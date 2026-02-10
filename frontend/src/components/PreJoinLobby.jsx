'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, ArrowRight } from 'lucide-react';

export default function PreJoinLobby({ userName, onJoinCall }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Audio visualizer refs
  const barsRef = useRef([]);
  const audioStateRef = useRef({ ctx: null, source: null, analyser: null, raf: null });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingTimeout = useRef(null);

  const initials = (userName || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => { setMounted(true); }, []);

  // Get camera/mic preview
  useEffect(() => {
    let cancelled = false;
    const getStream = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
      } catch (err) {
        console.error('Failed to get preview stream:', err);
      }
    };
    getStream();
    return () => {
      cancelled = true;
    };
  }, []);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  // Audio analyser for mic indicator wave
  useEffect(() => {
    const state = audioStateRef.current;

    const cleanup = () => {
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = null;
      if (state.source) { try { state.source.disconnect(); } catch {} }
      state.source = null;
      state.analyser = null;
      if (state.ctx && state.ctx.state !== 'closed') {
        state.ctx.close().catch(() => {});
      }
      state.ctx = null;
      setIsSpeaking(false);
      barsRef.current.forEach((bar) => {
        if (bar) { bar.style.height = '2px'; bar.style.opacity = '0.25'; }
      });
    };

    if (!stream || isAudioMuted) { cleanup(); return; }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length || !audioTracks[0].enabled) { cleanup(); return; }

    let cancelled = false;

    const init = async () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') await ctx.resume();
        if (cancelled) { ctx.close(); return; }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.4;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        source.connect(analyser);

        state.ctx = ctx;
        state.source = source;
        state.analyser = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const bandRanges = [[1, 4], [4, 7], [7, 11], [11, 16], [16, 23]];

        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArray);

          let maxLevel = 0;
          bandRanges.forEach((range, i) => {
            let sum = 0, count = 0;
            for (let b = range[0]; b < range[1]; b++) { sum += dataArray[b]; count++; }
            const level = Math.min((sum / count) / 180, 1);
            maxLevel = Math.max(maxLevel, level);
            const bar = barsRef.current[i];
            if (bar) {
              bar.style.height = `${Math.max(level * 14, 2)}px`;
              bar.style.opacity = `${Math.max(level, 0.25)}`;
            }
          });

          if (maxLevel > 0.15) {
            setIsSpeaking(true);
            if (speakingTimeout.current) clearTimeout(speakingTimeout.current);
            speakingTimeout.current = setTimeout(() => setIsSpeaking(false), 300);
          }

          state.raf = requestAnimationFrame(tick);
        };
        state.raf = requestAnimationFrame(tick);
      } catch (e) { /* Web Audio not available */ }
    };

    init();
    return () => {
      cancelled = true;
      cleanup();
      if (speakingTimeout.current) clearTimeout(speakingTimeout.current);
    };
  }, [stream, isAudioMuted]);

  const handleToggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleJoin = () => {
    // Stop preview stream — useWebRTC will create its own
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    onJoinCall({ initialAudioMuted: isAudioMuted, initialVideoOff: isVideoOff });
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-full max-w-2xl animate-fade-in-up">
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-satoshi font-bold text-white/90">Ready to join?</h2>
          <p className="text-white/40 text-sm font-cabinet mt-1">Check your camera and microphone before entering</p>
        </div>

        {/* Preview card */}
        <div className={`rounded-3xl frost-glass-card p-1.5 sm:p-2 transition-all duration-300 ${
          isSpeaking ? 'ring-2 ring-emerald-400/40 shadow-[0_0_24px_rgba(52,211,153,0.1)]' : ''
        }`}>
          {/* Video preview */}
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#111111]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Camera off state */}
            {isVideoOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111111]">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#556B2F] to-[#6B8E3D] flex items-center justify-center shadow-lg mb-3">
                  <span className="text-white text-3xl sm:text-5xl font-satoshi font-bold drop-shadow-sm">{initials}</span>
                </div>
                <span className="text-white/40 text-sm font-cabinet font-medium">{userName}</span>
                <div className="flex items-center gap-1.5 mt-2">
                  <VideoOff size={12} className="text-white/25" />
                  <span className="text-white/25 text-xs font-cabinet">Camera off</span>
                </div>
              </div>
            )}

            {/* Bottom overlay — name badge + mic wave */}
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg frost-glass text-white/80 text-xs font-cabinet font-medium flex items-center gap-2">
                  {userName || 'You'}
                  {/* Audio wave bars */}
                  {!isAudioMuted && (
                    <span className="flex items-end gap-[2px] h-3.5 ml-0.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          ref={(el) => (barsRef.current[i] = el)}
                          className="w-[2.5px] rounded-full bg-emerald-400"
                          style={{ height: '2px', opacity: 0.25, willChange: 'height, opacity' }}
                        />
                      ))}
                    </span>
                  )}
                </span>

                {isAudioMuted && (
                  <span className="w-6 h-6 rounded-lg frost-glass flex items-center justify-center">
                    <MicOff size={10} className="text-red-400" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mt-5">
          {/* Mic toggle */}
          <button
            onClick={handleToggleAudio}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              isAudioMuted
                ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/20'
                : 'frost-glass frost-glass-hover'
            }`}
            title={isAudioMuted ? 'Unmute' : 'Mute'}
          >
            {isAudioMuted ? <MicOff size={20} className="text-red-400" /> : <Mic size={20} className="text-white/80" />}
          </button>

          {/* Video toggle */}
          <button
            onClick={handleToggleVideo}
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              isVideoOff
                ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/20'
                : 'frost-glass frost-glass-hover'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? <VideoOff size={20} className="text-red-400" /> : <Video size={20} className="text-white/80" />}
          </button>

          {/* Join button */}
          <button
            onClick={handleJoin}
            className="h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-gradient-to-r from-[#556B2F] to-[#6B8E3D] hover:from-[#6B8E3D] hover:to-[#7BA348] flex items-center gap-2 transition-all duration-300 active:scale-[0.96] shadow-lg shadow-[#556B2F]/20"
          >
            <span className="text-white text-sm font-satoshi font-bold">Join Call</span>
            <ArrowRight size={16} className="text-white/80" />
          </button>
        </div>
      </div>
    </div>
  );
}
