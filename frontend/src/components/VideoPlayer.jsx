'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { User, MicOff } from 'lucide-react';

export default function VideoPlayer({ stream, muted, label, isAudioMuted, isVideoOff, isLocal }) {
  const videoRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [audioLevels, setAudioLevels] = useState([0, 0, 0, 0, 0]);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Audio analyser for wave bars
  useEffect(() => {
    if (!stream || isAudioMuted) {
      setAudioLevels([0, 0, 0, 0, 0]);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        // Pick 5 spread-out frequency bins
        const bins = [2, 4, 6, 8, 10];
        const levels = bins.map((i) => Math.min(dataArray[i] / 200, 1));
        setAudioLevels(levels);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      // AudioContext not available
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, [stream, isAudioMuted]);

  return (
    <div className={`relative rounded-xl sm:rounded-2xl overflow-hidden bg-[#111111] border border-white/[0.06] aspect-video group transition-all duration-500 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
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
          {/* Audio wave bars */}
          {!isAudioMuted && (
            <span className="flex items-end gap-[2px] h-3">
              {audioLevels.map((level, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-[#6B8E3D] transition-all duration-75"
                  style={{
                    height: `${Math.max(level * 100, 15)}%`,
                    opacity: Math.max(level, 0.3),
                  }}
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
