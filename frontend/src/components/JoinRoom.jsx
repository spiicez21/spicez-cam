'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

export default function JoinRoom({ onRoomJoined, onBack }) {
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { socket } = useSocket();

  const handleJoin = () => {
    if (!socket || !roomId.trim()) return;
    setLoading(true);
    setError('');

    socket.emit('join-room', { roomId: roomId.trim(), password: password || null }, (response) => {
      setLoading(false);
      if (response.success) {
        onRoomJoined(roomId.trim());
      } else {
        setError(response.error || 'Failed to join room.');
      }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={onBack}
          className="mb-8 text-white/50 hover:text-white transition-colors flex items-center gap-2"
        >
          ← Back
        </button>

        {/* Card */}
        <div className="p-8 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10">
          <h2 className="text-3xl font-bold mb-6">Join Room</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-white/50 text-sm mb-2">Room ID</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#556B2F] transition-colors"
              />
            </div>

            <div>
              <label className="block text-white/50 text-sm mb-2">
                Password (if required)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room password"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#556B2F] transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              onClick={handleJoin}
              disabled={loading || !roomId.trim()}
              className="w-full px-8 py-4 rounded-xl bg-[#556B2F] hover:bg-[#6B8E3D] text-white font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
