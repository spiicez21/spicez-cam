'use client';

export default function Landing({ onCreateRoom, onJoinRoom }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      {/* Logo & Title */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-black tracking-tight mb-2 font-satoshi">
          <span className="text-[#556B2F]">SpiceZ</span>
          <span className="text-white">-Cam</span>
        </h1>
        <p className="text-white/50 text-lg font-cabinet font-light">
          Secure peer-to-peer video calls
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          onClick={onCreateRoom}
          className="flex-1 px-8 py-4 rounded-2xl bg-[#556B2F] hover:bg-[#6B8E3D] text-white font-bold text-lg font-satoshi transition-all duration-300 backdrop-blur-md border border-white/10 shadow-lg hover:shadow-[#556B2F]/25"
        >
          Create Room
        </button>
        <button
          onClick={onJoinRoom}
          className="flex-1 px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-lg font-satoshi transition-all duration-300 backdrop-blur-md border border-white/10 shadow-lg"
        >
          Join Room
        </button>
      </div>

      {/* Glass Card Info */}
      <div className="mt-16 p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 max-w-md w-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#556B2F] animate-pulse" />
          <span className="text-white/70 text-sm font-cabinet">End-to-end encrypted</span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#556B2F] animate-pulse" />
          <span className="text-white/70 text-sm font-cabinet">No account required</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#556B2F] animate-pulse" />
          <span className="text-white/70 text-sm font-cabinet">Temporary rooms - no data stored</span>
        </div>
      </div>
    </div>
  );
}
