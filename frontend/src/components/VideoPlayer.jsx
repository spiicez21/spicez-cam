'use client';

import { useEffect, useRef, useState } from 'react';
import { User, MicOff } from 'lucide-react';

export default function VideoPlayer({ stream, muted, label, isAudioMuted, isVideoOff, isLocal }) {
  const videoRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const barsRef = useRef([]);
  const audioStateRef = useRef({ ctx: null, source: null, analyser: null, raf: null });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingTimeout = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Audio analyser — direct DOM updates for performance
  useEffect(() => {
    const state = audioStateRef.current;

    // Cleanup previous
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
      // Reset bars
      barsRef.current.forEach((bar) => {
        if (bar) {
          bar.style.height = '2px';
          bar.style.opacity = '0.25';
        }
      });
    };

    if (!stream || isAudioMuted) {
      cleanup();
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length || !audioTracks[0].enabled) {
      cleanup();
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Resume if browser suspended it
        if (ctx.state === 'suspended') await ctx.resume();

        if (cancelled) { ctx.close(); return; }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256; // 128 frequency bins — good resolution
        analyser.smoothingTimeConstant = 0.4; // responsive but not jittery
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        source.connect(analyser);

        state.ctx = ctx;
        state.source = source;
        state.analyser = analyser;

        const bufferLength = analyser.frequencyBinCount; // 128
        const dataArray = new Uint8Array(bufferLength);

        // Map 5 bars to frequency bands (low → high voice range ~85Hz–4kHz)
        // At 44.1kHz sampleRate with 256 fftSize: each bin = ~172Hz
        // Bins 0-23 cover 0-4kHz range — good for human voice
        const bandRanges = [
          [1, 4],    // ~172-688Hz — fundamental voice
          [4, 7],    // ~688-1200Hz — lower harmonics
          [7, 11],   // ~1200-1900Hz — mid harmonics
          [11, 16],  // ~1900-2750Hz — upper harmonics / clarity
          [16, 23],  // ~2750-3960Hz — presence / sibilance
        ];

        const tick = () => {
          if (cancelled) return;

          analyser.getByteFrequencyData(dataArray);

          let maxLevel = 0;

          bandRanges.forEach((range, i) => {
            // Average the bins in this frequency band
            let sum = 0;
            let count = 0;
            for (let b = range[0]; b < range[1]; b++) {
              sum += dataArray[b];
              count++;
            }
            const avg = sum / count;
            // Normalize: dataArray values are 0-255
            const level = Math.min(avg / 180, 1);
            maxLevel = Math.max(maxLevel, level);

            const bar = barsRef.current[i];
            if (bar) {
              const h = Math.max(level * 14, 2); // 2px min, 14px max
              bar.style.height = `${h}px`;
              bar.style.opacity = `${Math.max(level, 0.25)}`;
            }
          });

          // Speaking detection with debounce
          if (maxLevel > 0.15) {
            setIsSpeaking(true);
            if (speakingTimeout.current) clearTimeout(speakingTimeout.current);
            speakingTimeout.current = setTimeout(() => setIsSpeaking(false), 300);
          }

          state.raf = requestAnimationFrame(tick);
        };

        state.raf = requestAnimationFrame(tick);
      } catch (e) {
        // Web Audio not available
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanup();
      if (speakingTimeout.current) clearTimeout(speakingTimeout.current);
    };
  }, [stream, isAudioMuted]);

  return (
    <div className={`relative rounded-xl sm:rounded-2xl overflow-hidden bg-[#111111] aspect-video group transition-all duration-300 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${isSpeaking ? 'border border-[#6B8E3D]/40 shadow-[0_0_20px_rgba(107,142,61,0.15)]' : 'border border-white/[0.06]'}`}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
        style={isLocal ? { transform: 'scaleX(-1)' } : undefined}
      />

      {/* Video off state */}
      {isVideoOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#111111]">
          <div className="flex flex-col items-center gap-2 sm:gap-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#556B2F]/10 border border-[#556B2F]/15 flex items-center justify-center">
              <User size={24} className="text-[#556B2F] hidden sm:block" strokeWidth={1.5} />
              <User size={18} className="text-[#556B2F] sm:hidden" strokeWidth={1.5} />
            </div>
            <span className="text-white/20 text-[10px] sm:text-xs font-cabinet">Camera off</span>
          </div>
        </div>
      )}

      {/* Gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-12 sm:h-20 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Label pill + wave bars */}
      <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 flex items-center gap-1.5 sm:gap-2 transition-all duration-300">
        <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-black/50 backdrop-blur-md border border-white/[0.06] text-white/80 text-[10px] sm:text-xs font-satoshi font-medium flex items-center gap-1.5 sm:gap-2">
          {label}
          {/* Audio wave bars — direct DOM refs for 60fps */}
          {!isAudioMuted && (
            <span className="flex items-end gap-[2px] h-3.5 ml-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  ref={(el) => (barsRef.current[i] = el)}
                  className="w-[3px] rounded-full bg-[#6B8E3D]"
                  style={{ height: '2px', opacity: 0.25, willChange: 'height, opacity' }}
                />
              ))}
            </span>
          )}
        </span>
        {isAudioMuted && (
          <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-red-500/20 backdrop-blur-md border border-red-500/20 flex items-center justify-center">
            <MicOff size={10} className="text-red-400" strokeWidth={2.5} />
          </span>
        )}
      </div>

      {/* Local indicator */}
      {isLocal && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#6B8E3D] animate-pulse" />
        </div>
      )}
    </div>
  );
}
