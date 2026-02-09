'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';

export default function CreateRoom({ onRoomCreated, onBack }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreate = () => {
    if (!socket) return;
    setLoading(true);
    setError('');

    socket.emit('create-room', { password: password || null }, (response) => {
      setLoading(false);
      if (response.success) {
        onRoomCreated(response.roomId);
      } else {
        setError('Failed to create room. Please try again.');
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
        <div className="p-8 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.06] shadow-[0_8px_64px_rgba(0,0,0,0.4)]">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#556B2F]/15 flex items-center justify-center shrink-0">
                <Plus size={20} className="text-[#6B8E3D]" />
              </div>
              <h2 className="text-3xl font-black font-satoshi tracking-tight text-white/90">Create Room</h2>
            </div>
            <p className="text-white/30 text-sm font-cabinet font-light mt-1">Start a new video call</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-white/40 text-xs font-cabinet font-medium uppercase tracking-wider mb-2">
                Password
                <span className="text-white/20 lowercase tracking-normal ml-1">(optional)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set a room password"
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white placeholder-white/20 font-cabinet focus:outline-none focus:border-[#556B2F]/50 focus:bg-white/[0.06] transition-all duration-300"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm font-cabinet">{error}</p>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full px-8 py-4 rounded-xl bg-[#556B2F] text-white font-bold text-base font-satoshi transition-all duration-300 hover:bg-[#6B8E3D] hover:shadow-[0_8px_32px_rgba(85,107,47,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </span>
              ) : 'Create Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
