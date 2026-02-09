'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { ArrowLeft, LogIn, Loader2, UserRound } from 'lucide-react';

export default function JoinRoom({ onRoomJoined, onBack }) {
  const [name, setName] = useState('');
  const [digits, setDigits] = useState(Array(5).fill(''));
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const { socket } = useSocket();
  const inputRefs = useRef([]);

  const roomId = digits.join('');

  const handleDigitChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.toUpperCase().slice(0, 5 - index).split('');
      const newDigits = [...digits];
      pasted.forEach((char, i) => {
        if (index + i < 5) newDigits[index + i] = char;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(index + pasted.length, 4);
      inputRefs.current[nextIndex]?.focus();
      return;
    }
    const newDigits = [...digits];
    newDigits[index] = value.toUpperCase();
    setDigits(newDigits);
    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleJoin = () => {
    if (!socket || !roomId.trim() || !name.trim()) return;
    setLoading(true);
    setError('');

    socket.emit('join-room', { roomId: roomId.trim(), password: password || null, userName: name.trim() }, (response) => {
      setLoading(false);
      if (response.success) {
        onRoomJoined(roomId.trim(), name.trim());
      } else {
        setError(response.error || 'Failed to join room.');
      }
    });
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#556B2F]/6 blur-[100px] pointer-events-none" />

      <div className={`relative z-10 w-full max-w-md transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Back button */}
        <button
          onClick={onBack}
          className="group mb-8 text-white/30 hover:text-white/70 transition-all duration-300 flex items-center gap-2 font-cabinet text-sm"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform duration-300" />
          Back
        </button>

        {/* Glass Card */}
        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] shadow-[0_8px_64px_rgba(0,0,0,0.4)]">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#556B2F]/15 flex items-center justify-center shrink-0">
                <LogIn size={20} className="text-[#6B8E3D]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-satoshi tracking-tight text-white/90">Join Room</h2>
            </div>
            <p className="text-white/30 text-sm font-cabinet font-light mt-1">Enter a room ID to connect</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-white/40 text-xs font-cabinet font-medium uppercase tracking-wider mb-2">
                Your Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full pl-10 pr-4 py-3 sm:py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-white/20 font-cabinet text-sm sm:text-base focus:outline-none focus:border-[#556B2F]/50 focus:bg-white/[0.06] transition-all duration-300"
                />
                <UserRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
              </div>
            </div>

            <div>
              <label className="block text-white/40 text-xs font-cabinet font-medium uppercase tracking-wider mb-3">
                Room ID
              </label>
              <div className="flex gap-1.5 sm:gap-2 justify-between">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text').replace(/\s/g, '').toUpperCase().slice(0, 5 - i);
                      handleDigitChange(i, pasted);
                    }}
                    className="flex-1 min-w-0 aspect-square max-w-12 rounded-md sm:rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-center text-base sm:text-lg font-mono font-bold focus:outline-none focus:border-[#556B2F]/60 focus:bg-white/[0.08] transition-all duration-200 placeholder-white/10"
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-white/40 text-xs font-cabinet font-medium uppercase tracking-wider mb-2">
                Password
                <span className="text-white/20 lowercase tracking-normal ml-1">(if required)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Room password"
                className="w-full px-4 py-3 sm:py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-white/20 font-cabinet text-sm sm:text-base focus:outline-none focus:border-[#556B2F]/50 focus:bg-white/[0.06] transition-all duration-300"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 animate-shake">
                <p className="text-red-400 text-sm font-cabinet">{error}</p>
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={loading || roomId.length < 5 || !name.trim()}
              className="w-full px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl bg-[#556B2F] text-white font-bold text-sm sm:text-base font-satoshi transition-all duration-300 hover:bg-[#6B8E3D] hover:shadow-[0_8px_32px_rgba(85,107,47,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Joining...
                </span>
              ) : 'Join Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
