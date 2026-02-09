# SpiceZ-Cam 🎥

Peer-to-peer video calling app with room-based sessions, built with WebRTC, Socket.io, and Next.js. Featuring an Apple Music-inspired glassmorphism UI in olive green and crow black.

![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.7-010101?logo=socket.io&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-Native-333333?logo=webrtc&logoColor=white)

---

## Features

- **Instant Rooms** — Create a room with one click, get a shareable 8-character ID
- **Password Protection** — Optional password lock for private calls
- **Peer-to-Peer Video** — Direct WebRTC connections, no media relay server
- **Live Device Switching** — Swap mic/camera mid-call without dropping peers
- **Participants Panel** — See who's in the call with real-time join/leave updates
- **Audio Waveform** — 5-bar voice visualizer with speaking detection glow
- **Responsive** — Mobile-first design across all views
- **Glassmorphism UI** — Frosted glass cards, ambient glow orbs, staggered animations

## Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4, lucide-react |
| **Backend** | Express.js, Socket.io, UUID |
| **Real-time** | WebRTC (native RTCPeerConnection), Socket.io signaling |
| **Fonts** | Satoshi (headings), Cabinet Grotesk (body) |
| **Theme** | Olive Green `#556B2F` + Crow Black `#0A0A0A` |

## Project Structure

```
spicez-cam/
├── backend/
│   ├── server.js          # Signaling server (rooms, WebRTC relay)
│   ├── package.json
│   └── .env               # PORT, FRONTEND_URL
├── frontend/
│   ├── app/
│   │   ├── page.tsx        # View router (landing → create/join → call)
│   │   ├── layout.tsx      # Root layout with fonts
│   │   └── globals.css     # @font-face, CSS vars, animations
│   ├── src/
│   │   ├── components/
│   │   │   ├── Landing.jsx     # Home screen with feature cards
│   │   │   ├── CreateRoom.jsx  # Room creation form
│   │   │   ├── JoinRoom.jsx    # Room join with OTP-style ID input
│   │   │   ├── VideoCall.jsx   # Call UI, participants, device selectors
│   │   │   └── VideoPlayer.jsx # Video tile + audio waveform visualizer
│   │   ├── hooks/
│   │   │   ├── useSocket.js    # Socket.io connection manager
│   │   │   ├── useWebRTC.js    # Peer connections, streams, participants
│   │   │   └── useDevices.js   # Media device enumeration & selection
│   │   └── utils/
│   │       └── webrtc.js       # RTCPeerConnection factory
│   └── public/
│       ├── Satoshi/            # Heading font files (OTF)
│       └── Cabinet-grotesk/    # Body font files (TTF)
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### 1. Clone

```bash
git clone <your-repo-url> spicez-cam
cd spicez-cam
```

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file (or use the existing one):

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
```

Start the signaling server:

```bash
npm run dev
```

### 3. Frontend

In a new terminal:

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. **Create a Room** — Enter your name, optionally set a password, click Create
2. **Share the Room ID** — Copy the 8-character ID from the header pill
3. **Join a Room** — Paste the room ID into the OTP input, enter your name, join
4. **In-call Controls**:
   - 🎤 Toggle mic on/off
   - 📹 Toggle camera on/off
   - ⚙️ Switch mic/camera devices live
   - 👥 View participants panel
   - 📋 Click room ID to copy
   - 🔴 Leave call

## Architecture

```
┌─────────────┐   WebSocket    ┌─────────────────┐
│   Browser A  │◄──────────────►│  Signaling      │
│  (Next.js)   │   (Socket.io)  │  Server (Node)  │
└──────┬───────┘                └────────┬────────┘
       │                                  │
       │  WebRTC (peer-to-peer)          │
       │  video/audio streams            │
       │                                  │
┌──────▼───────┐   WebSocket    ┌────────▼────────┐
│   Browser B  │◄──────────────►│  Same signaling │
│  (Next.js)   │                │  server         │
└──────────────┘                └─────────────────┘
```

The signaling server only relays connection metadata (offers, answers, ICE candidates). All media flows directly between peers via WebRTC.

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Server port |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:5000` | Signaling server URL |

## License

MIT
