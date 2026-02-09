'use client';

import { useEffect, useRef, useState } from 'react';
import { User, MicOff } from 'lucide-react';

export default function VideoPlayer({ stream, muted, label, isAudioMuted, isVideoOff, isLocal }) {
  const videoRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-[#111111] border border-white/[0.06] aspect-video group transition-all duration-500 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
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
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[#556B2F]/10 border border-[#556B2F]/15 flex items-center justify-center">
              <User size={24} className="text-[#556B2F]" strokeWidth={1.5} />
            </div>
            <span className="text-white/20 text-xs font-cabinet">Camera off</span>
          </div>
        </div>
      )}

      {/* Gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Label pill */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 transition-all duration-300">
        <span className="px-3 py-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/[0.06] text-white/80 text-xs font-satoshi font-medium">
          {label}
        </span>
        {isAudioMuted && (
          <span className="w-6 h-6 rounded-lg bg-red-500/20 backdrop-blur-md border border-red-500/20 flex items-center justify-center">
            <MicOff size={10} className="text-red-400" strokeWidth={2.5} />
          </span>
        )}
      </div>

      {/* Local indicator */}
      {isLocal && (
        <div className="absolute top-3 right-3">
          <div className="w-2 h-2 rounded-full bg-[#6B8E3D] animate-pulse" />
        </div>
      )}
    </div>
  );
}
