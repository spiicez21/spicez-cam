'use client';

import { useEffect, useRef } from 'react';

export default function VideoPlayer({ stream, muted, label, isAudioMuted, isVideoOff }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#1A1A1A] border border-white/10 aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
      />

      {/* Video off placeholder */}
      {isVideoOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]">
          <div className="w-20 h-20 rounded-full bg-[#556B2F]/20 flex items-center justify-center">
            <span className="text-3xl">👤</span>
          </div>
        </div>
      )}

      {/* Label */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-sm">
          {label}
        </span>
        {isAudioMuted && (
          <span className="px-2 py-1 rounded-full bg-red-500/30 text-red-400 text-xs">
            🔇
          </span>
        )}
      </div>
    </div>
  );
}
