'use client';

import { useState, useEffect } from 'react';
import { Video, Plus, LogIn, ShieldCheck, Zap, Ghost } from 'lucide-react';

export default function Landing({ onCreateRoom, onJoinRoom }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] rounded-full bg-[#556B2F]/8 blur-[80px] sm:blur-[120px] animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] rounded-full bg-[#556B2F]/5 blur-[60px] sm:blur-[100px] animate-glow-drift" />
      </div>

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Logo & Title */}
        <div className="text-center mb-8 sm:mb-14">
          {/* Icon mark */}
          <div className={`mx-auto mb-4 sm:mb-6 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#556B2F]/20 backdrop-blur-sm border border-[#556B2F]/30 flex items-center justify-center transition-all duration-700 delay-200 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
            <Video size={28} className="text-[#6B8E3D] hidden sm:block" />
            <Video size={20} className="text-[#6B8E3D] sm:hidden" />
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter mb-2 sm:mb-3 font-satoshi leading-none">
            <span className="text-[#556B2F]">Spice</span><span className="text-[#6B8E3D]">Z</span>
            <span className="text-white/90">-Cam</span>
          </h1>
          <p className="text-white/40 text-sm sm:text-lg font-cabinet font-light tracking-wide px-2">
            Peer-to-peer video, no strings attached
          </p>
        </div>

        {/* Action Buttons */}
        <div className={`flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-lg px-2 sm:px-0 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <button
            onClick={onCreateRoom}
            className="group flex-1 relative px-6 sm:px-10 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-[#556B2F] text-white font-bold text-sm sm:text-base font-satoshi whitespace-nowrap transition-all duration-300 hover:bg-[#6B8E3D] hover:shadow-[0_8px_32px_rgba(85,107,47,0.3)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Plus size={18} strokeWidth={2.5} />
              Create Room
            </span>
          </button>
          <button
            onClick={onJoinRoom}
            className="flex-1 px-6 sm:px-10 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-white/[0.04] text-white/80 font-bold text-sm sm:text-base font-satoshi whitespace-nowrap transition-all duration-300 backdrop-blur-xl border border-white/[0.08] hover:bg-white/[0.08] hover:text-white hover:border-white/[0.15] hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex items-center justify-center gap-2">
              <LogIn size={18} strokeWidth={2.5} />
              Join Room
            </span>
          </button>
        </div>

        {/* Glass Feature Card */}
        <div className={`mt-8 sm:mt-14 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] max-w-sm w-full transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="space-y-3">
            {[
              { icon: <ShieldCheck size={14} className="text-[#6B8E3D]" />, text: 'End-to-end encrypted calls' },
              { icon: <Zap size={14} className="text-[#6B8E3D]" />, text: 'No sign-up required' },
              { icon: <Ghost size={14} className="text-[#6B8E3D]" />, text: 'Rooms vanish when you leave' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-[#556B2F]/10 flex items-center justify-center shrink-0 group-hover:bg-[#556B2F]/20 transition-colors duration-300">
                  {item.icon}
                </div>
                <span className="text-white/45 text-sm font-cabinet font-light group-hover:text-white/60 transition-colors duration-300">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className={`mt-6 sm:mt-10 text-white/20 text-[10px] sm:text-xs font-cabinet tracking-widest uppercase transition-all duration-700 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          WebRTC &middot; Socket.io &middot; No data stored
        </p>
      </div>
    </div>
  );
}
