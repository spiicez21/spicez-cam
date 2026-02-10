'use client';

import { useEffect, useRef, useState } from 'react';
import { MicOff, VideoOff } from 'lucide-react';

export default function VideoPlayer({
  stream, muted, label, isAudioMuted, isVideoOff, isLocal,
  avatarColor = 'from-pink-400 to-pink-600',
}) {
  const videoRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const barsRef = useRef([]);
  const audioStateRef = useRef({ ctx: null, source: null, analyser: null, raf: null });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingTimeout = useRef(null);

  // Extract initials from label
  const initials = (label || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Audio analyser
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

  return (
    <div className={`relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#111111] h-full transition-all duration-500 ${
      mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
    } ${
      isSpeaking ? 'ring-2 ring-emerald-400/40 shadow-[0_0_24px_rgba(52,211,153,0.1)]' : ''
    }`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
        style={isLocal ? { transform: 'scaleX(-1)' } : undefined}
      />

      {/* Camera off — colorful avatar */}
      {isVideoOff && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111111]">
          <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center shadow-lg mb-3`}>
            <span className="text-white text-2xl sm:text-4xl font-satoshi font-bold drop-shadow-sm">{initials}</span>
          </div>
          <span className="text-white/30 text-xs font-cabinet font-medium">{label}</span>
          <div className="flex items-center gap-1 mt-1.5">
            <VideoOff size={10} className="text-white/20" />
            <span className="text-white/20 text-[10px] font-cabinet">Camera off</span>
          </div>
        </div>
      )}

      {/* Bottom overlay — frost glass name pill */}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg frost-glass text-white/80 text-[11px] sm:text-xs font-cabinet font-medium flex items-center gap-2">
              {label}
              {isLocal && <span className="text-white/30 text-[9px]">(You)</span>}
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

          {isLocal && (
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
