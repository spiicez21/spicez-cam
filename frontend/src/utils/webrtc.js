// Build ICE servers from env vars (TURN) + free STUN
const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

const iceServers = [
  // Use only 2 STUN servers — more adds lookup latency without benefit
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Add TURN servers if credentials are configured
if (turnUrl && turnUsername && turnCredential) {
  const urls = turnUrl.split(',').map((u) => u.trim());
  iceServers.push({
    urls,
    username: turnUsername,
    credential: turnCredential,
  });
}

const ICE_CONFIG = {
  iceServers,
  iceCandidatePoolSize: 10,
  // Prioritize UDP for lower latency
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

/**
 * Prefer a codec by moving it to the top of the SDP m= line.
 * This nudges the browser to pick lower-latency codecs.
 */
function preferCodec(sdp, type, codecName) {
  const lines = sdp.split('\r\n');
  const mLineIdx = lines.findIndex((l) => l.startsWith(`m=${type}`));
  if (mLineIdx === -1) return sdp;

  // Find payload types for the preferred codec
  const codecRegex = new RegExp(`a=rtpmap:(\\d+) ${codecName}/`, 'i');
  const payloadTypes = [];
  lines.forEach((l) => {
    const m = l.match(codecRegex);
    if (m) payloadTypes.push(m[1]);
  });

  if (!payloadTypes.length) return sdp;

  // Reorder the m= line to put preferred codec first
  const mLineParts = lines[mLineIdx].split(' ');
  // First 3 parts are: m=<type> <port> <proto>
  const header = mLineParts.slice(0, 3);
  const existingPts = mLineParts.slice(3);
  const remaining = existingPts.filter((pt) => !payloadTypes.includes(pt));
  lines[mLineIdx] = [...header, ...payloadTypes, ...remaining].join(' ');

  return lines.join('\r\n');
}

/**
 * Apply low-latency SDP tweaks:
 * - Prefer VP8 for video (lower encode latency than VP9/H264 software)
 * - Prefer Opus for audio (already default, but ensure it)
 * - Set Opus to low-latency mode via fmtp
 */
function applyLowLatencySDP(sdp) {
  let modified = sdp;
  // Prefer VP8 for video — fastest software encode
  modified = preferCodec(modified, 'video', 'VP8');
  // Prefer Opus for audio
  modified = preferCodec(modified, 'audio', 'opus');

  // Set Opus to low-latency: stereo=0, usedtx=1 (discontinuous transmission),
  // maxaveragebitrate for quality, ptime=20 for low frame size
  modified = modified.replace(
    /a=fmtp:(\d+) (.*opus.*)/gi,
    (match, pt, params) => {
      const extras = 'stereo=0;usedtx=1;maxaveragebitrate=32000';
      // Append if not already there
      if (params.includes('maxaveragebitrate')) return match;
      return `a=fmtp:${pt} ${params};${extras}`;
    }
  );

  return modified;
}

/**
 * Create a new RTCPeerConnection and wire up tracks + ICE candidates.
 * Batches ICE candidates to reduce signaling messages.
 */
export function createPeerConnection(peerId, socket, localStream, onRemoteStream, onConnectionState) {
  const pc = new RTCPeerConnection(ICE_CONFIG);

  // Add local tracks with degradation preferences
  localStream.getTracks().forEach((track) => {
    const sender = pc.addTrack(track, localStream);
    // Set encoding params for video — prioritize low latency
    if (track.kind === 'video' && sender.getParameters) {
      try {
        const params = sender.getParameters();
        if (params.encodings && params.encodings.length > 0) {
          params.encodings[0].maxBitrate = 1500000; // 1.5 Mbps cap
          params.encodings[0].maxFramerate = 30;
          // Prefer maintain-framerate over maintain-resolution for smoothness
          params.degradationPreference = 'maintain-framerate';
          sender.setParameters(params).catch(() => {});
        }
      } catch {}
    }
  });

  // Handle incoming remote tracks
  pc.ontrack = (event) => {
    const [remoteStream] = event.streams;
    if (remoteStream) {
      onRemoteStream(remoteStream);
    }
  };

  // ICE candidate batching — collect for 50ms then flush
  let candidateBatch = [];
  let batchTimer = null;

  const flushCandidates = () => {
    if (candidateBatch.length > 0) {
      socket.emit('ice-candidates', {
        to: peerId,
        candidates: candidateBatch,
      });
      candidateBatch = [];
    }
    batchTimer = null;
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      candidateBatch.push(event.candidate);
      if (!batchTimer) {
        batchTimer = setTimeout(flushCandidates, 50);
      }
    } else {
      // End of candidates — flush immediately
      flushCandidates();
    }
  };

  // Connection state monitoring
  pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState;
    if (onConnectionState) onConnectionState(peerId, state);

    if (state === 'failed') {
      // Attempt ICE restart for recovery
      pc.restartIce();
    }
  };

  return pc;
}

/**
 * Create an offer with low-latency SDP tweaks
 */
export async function createLowLatencyOffer(pc) {
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  offer.sdp = applyLowLatencySDP(offer.sdp);
  await pc.setLocalDescription(offer);
  return offer;
}

/**
 * Create an answer with low-latency SDP tweaks
 */
export async function createLowLatencyAnswer(pc, offer) {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  answer.sdp = applyLowLatencySDP(answer.sdp);
  await pc.setLocalDescription(answer);
  return answer;
}
