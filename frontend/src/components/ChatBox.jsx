'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';

export default function ChatBox({ socket, roomId, userName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('chat-message', handleMessage);
    return () => { socket.off('chat-message', handleMessage); };
  }, [socket]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !socket) return;
    socket.emit('chat-message', { roomId, message: trimmed });
    setInput('');
  };

  const formatTime = (timestamp) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-80 sm:w-96 h-[28rem] rounded-2xl frost-glass-panel shadow-2xl flex flex-col overflow-hidden animate-[fade-in-up_0.2s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <span className="text-white/90 text-sm font-satoshi font-bold">Chat</span>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <span className="text-white/20 text-xs font-cabinet">No messages yet</span>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.userId === socket?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && (
                <span className="text-white/40 text-[10px] font-cabinet font-medium mb-0.5 ml-1">{msg.userName}</span>
              )}
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm font-cabinet break-words ${
                isMe
                  ? 'bg-[#556B2F]/40 text-white/90 rounded-br-md'
                  : 'bg-white/[0.06] text-white/80 rounded-bl-md'
              }`}>
                {msg.message}
              </div>
              <span className="text-white/20 text-[9px] font-cabinet mt-0.5 mx-1">{formatTime(msg.timestamp)}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-3 py-2.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-white/90 text-sm font-cabinet placeholder:text-white/20 focus:outline-none focus:border-white/[0.16] transition-all duration-200"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl bg-[#556B2F]/60 hover:bg-[#556B2F]/80 disabled:opacity-30 disabled:hover:bg-[#556B2F]/60 flex items-center justify-center transition-all duration-200"
          >
            <Send size={14} className="text-white/80" />
          </button>
        </div>
      </form>
    </div>
  );
}
