'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Hand, Users, MessageSquare,
  Send, X, Subtitles, MonitorUp, MoreVertical, Info, LayoutGrid
} from 'lucide-react';

export default function Meeting() {
  const router = useRouter();
  const params = useParams();
  const meetingId = params.id as string;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [mediaEnabled, setMediaEnabled] = useState({ audio: false, video: false });
  const [activeTab, setActiveTab] = useState<'chat' | 'people' | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isCoHost, setIsCoHost] = useState(false);
  const [meetingEnded, setMeetingEnded] = useState(false);
  const [meetingEndedReason, setMeetingEndedReason] = useState('');
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream[]>>({});
  const [meetingInfo, setMeetingInfo] = useState<{
    title: string;
    roomCode: string;
    hostName: string;
    hostId: string;
    participantUsers: Record<string, { name: string; avatarUrl?: string | null }>;
  } | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isLeaveMenuOpen, setIsLeaveMenuOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [speakingParticipants, setSpeakingParticipants] = useState<Record<string, boolean>>({});
  const [showAutoplayOverlay, setShowAutoplayOverlay] = useState(false);
  const [isGridView, setIsGridView] = useState(true);
  const [isDeviceSettingsOpen, setIsDeviceSettingsOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [openParticipantMenuUserId, setOpenParticipantMenuUserId] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mediaEnabledRef = useRef(mediaEnabled);
  const pendingMediaSyncRef = useRef(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  type PeerState = {
    pc: RTCPeerConnection;
    makingOffer: boolean;
    ignoreOffer: boolean;
    isSettingRemoteAnswerPending: boolean;
    polite: boolean;
    pendingIce: RTCIceCandidateInit[];
  };
  const peerStateRef = useRef<Record<string, PeerState>>({});
  const remoteStreamsRef = useRef<Record<string, MediaStream[]>>({});

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    mediaEnabledRef.current = mediaEnabled;
  }, [mediaEnabled]);

  useEffect(() => {
    if (!openParticipantMenuUserId) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const isMenu = target.closest('[data-participant-menu="true"]');
      const isButton = target.closest('[data-participant-menu-button="true"]');
      if (!isMenu && !isButton) {
        setOpenParticipantMenuUserId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openParticipantMenuUserId]);

  useEffect(() => {
    if (!socket?.id) return;
    const me = participants.find((p) => p.socketId === socket.id);
    setIsCoHost(me?.role === 'CO_HOST');
  }, [participants, socket?.id]);

  useEffect(() => {
    if (!isDeviceSettingsOpen) return;
    let isActive = true;

    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!isActive) return;

        const audios = devices.filter((d) => d.kind === 'audioinput');
        const videos = devices.filter((d) => d.kind === 'videoinput');
        setAudioDevices(audios);
        setVideoDevices(videos);

        if (!selectedAudioDeviceId && audios[0]) {
          setSelectedAudioDeviceId(audios[0].deviceId);
        }
        if (!selectedVideoDeviceId && videos[0]) {
          setSelectedVideoDeviceId(videos[0].deviceId);
        }
      } catch (e) {
        console.error('Failed to load media devices', e);
      }
    };

    loadDevices();
    return () => {
      isActive = false;
    };
  }, [isDeviceSettingsOpen, selectedAudioDeviceId, selectedVideoDeviceId]);

  // Real-time Voice Activity Detection (VAD)
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const analysers: Record<string, { interval: any; node: AnalyserNode }> = {};

    const setupMonitor = (id: string, stream: MediaStream) => {
      if (analysers[id] || stream.getAudioTracks().length === 0) return;
      try {
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const interval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const avg = sum / dataArray.length;
          const isSpeaking = avg > 15; // Volume threshold
          setSpeakingParticipants(prev => {
            if (prev[id] === isSpeaking) return prev;
            // Emit to others if local
            if (id === 'local' && socket) {
              socket.emit('media:speaking', { meetingId, speaking: isSpeaking });
            }
            return { ...prev, [id]: isSpeaking };
          });
        }, 150);

        analysers[id] = { interval, node: analyser };
      } catch (e) {
        console.warn('VAD Setup Error:', id, e);
      }
    };

    // Monitor Local Only and emit to socket
    if (localStream && mediaEnabled.audio) {
      setupMonitor('local', localStream);
    } else {
      setSpeakingParticipants(prev => {
        if (prev['local'] === false) return prev;
        if (socket) socket.emit('media:speaking', { meetingId, speaking: false });
        return { ...prev, local: false };
      });
    }

    // Remote monitoring removed - now handled via sockets!

    return () => {
      Object.values(analysers).forEach(a => clearInterval(a.interval));
      audioContext.close().catch(() => { });
    };
  }, [localStream, mediaEnabled.audio, socket, meetingId]);

  const mobileStyles = `
    @media (max-width: 768px) {
      .video-grid-container {
        padding: 0.5rem !important;
        gap: 0.5rem !important;
      }
      .participant-card {
        flex: 1 1 100% !important;
        max-width: 100% !important;
        max-height: 30vh !important;
      }
      .sidebar-container {
        position: absolute !important;
        top: 0 !important;
        right: 0 !important;
        width: 100% !important;
        height: calc(100% - 80px) !important;
        z-index: 50 !important;
      }
      .bottom-bar {
        padding: 0 0.5rem !important;
        height: 80px !important;
        position: relative !important;
        z-index: 110 !important;
      }
      .bottom-bar-info {
        display: none !important;
      }
      .bottom-bar-actions {
        display: none !important;
      }
      .controls-container {
        gap: 0.5rem !important;
        flex: 1 !important;
        justify-content: center !important;
      }
      .control-btn {
        width: 40px !important;
        height: 40px !important;
      }
      .control-btn svg {
        width: 18px !important;
        height: 18px !important;
      }
      .leave-btn {
        width: 50px !important;
        padding: 0 !important;
        justify-content: center !important;
      }
      .leave-btn span {
        display: none !important;
      }
      .name-badge-container {
        bottom: 0.5rem !important;
        left: 0.5rem !important;
      }
      .name-badge {
        font-size: 0.65rem !important;
        padding: 0.15rem 0.5rem !important;
        border-radius: 8px !important;
        max-width: 80px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
    }
  `;

  useEffect(() => {
    return () => {
      Object.values(peerStateRef.current).forEach((state) => state.pc.close());
      peerStateRef.current = {};
      remoteStreamsRef.current = {};
      setRemoteStreams({});
    };
  }, []);

  const addRemoteStream = (socketId: string, stream: MediaStream) => {
    const existing = remoteStreamsRef.current[socketId] || [];
    // Ensure we have the latest reference and trigger re-render
    const otherStreams = existing.filter(s => s.id !== stream.id);
    const updated = [...otherStreams, stream];
    remoteStreamsRef.current = { ...remoteStreamsRef.current, [socketId]: updated };
    setRemoteStreams({ ...remoteStreamsRef.current });
  };

  const removeSpecificStream = (socketId: string, streamId: string) => {
    const existing = remoteStreamsRef.current[socketId] || [];
    const updated = existing.filter(s => s.id !== streamId);
    remoteStreamsRef.current = { ...remoteStreamsRef.current, [socketId]: updated };
    setRemoteStreams(remoteStreamsRef.current);
  };

  const removeAllRemoteStreams = (socketId: string) => {
    const nextStreams = { ...remoteStreamsRef.current };
    delete nextStreams[socketId];
    remoteStreamsRef.current = nextStreams;
    setRemoteStreams(nextStreams);
  };

  const createPeerConnection = (targetId: string, activeSocket: Socket) => {
    const existing = peerStateRef.current[targetId];
    if (existing) return existing;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    const state: PeerState = {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemoteAnswerPending: false,
      polite: (activeSocket.id || '').localeCompare(targetId) < 0,
      pendingIce: [],
    };

    peerStateRef.current[targetId] = state;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        activeSocket.emit('webrtc:ice-candidate', {
          to: targetId,
          from: activeSocket.id,
          candidate: event.candidate,
        });
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        state.makingOffer = true;
        await pc.setLocalDescription(await pc.createOffer());
        activeSocket.emit('webrtc:offer', {
          to: targetId,
          from: activeSocket.id,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error(err);
      } finally {
        state.makingOffer = false;
      }
    };

    pc.ontrack = (event) => {
      const [streamFromEvent] = event.streams;
      if (streamFromEvent) {
        addRemoteStream(targetId, streamFromEvent);

        streamFromEvent.onremovetrack = () => {
          if (streamFromEvent.getTracks().length === 0) {
            removeSpecificStream(targetId, streamFromEvent.id);
          }
        };

        return;
      }

      const existing = (remoteStreamsRef.current[targetId] || [])[0] || new MediaStream();
      existing.addTrack(event.track);
      addRemoteStream(targetId, existing);
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc!.connectionState)) {
        pc!.close();
        delete peerStateRef.current[targetId];
        removeAllRemoteStreams(targetId);
      }
    };

    // Add tracks AFTER attaching all event listeners so negotiationneeded fires reliably!
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }
    const screenStream = screenStreamRef.current;
    if (screenStream) {
      screenStream.getTracks().forEach((track) => pc.addTrack(track, screenStream));
    }

    return state;
  };

  const updatePeerConnectionsTracks = async (
    stream: MediaStream | null,
    activeSocket: Socket | null,
  ) => {
    const audioTrack = stream?.getAudioTracks()[0] ?? null;
    const videoTrack = stream?.getVideoTracks()[0] ?? null;

    const pcs = Object.entries(peerStateRef.current);

    pcs.forEach(([, state]) => {
      const pc = state.pc;
      const senders = pc.getSenders();
      const screenTrack = screenStreamRef.current?.getVideoTracks()[0];

      let audioSender = senders.find(s => s.track?.kind === 'audio');
      let videoSender = senders.find(s => s.track?.kind === 'video' && s.track !== screenTrack);

      if (!audioSender) {
        const t = pc.getTransceivers().find(t => t.receiver.track.kind === 'audio');
        if (t) audioSender = t.sender;
      }
      if (!videoSender) {
        const t = pc.getTransceivers().find(t => t.receiver.track.kind === 'video' && t.sender.track !== screenTrack);
        if (t) videoSender = t.sender;
      }

      if (audioSender) {
        audioSender.replaceTrack(audioTrack);
      } else if (audioTrack && stream) {
        pc.addTrack(audioTrack, stream);
      }

      if (videoSender) {
        videoSender.replaceTrack(videoTrack);
      } else if (videoTrack && stream) {
        pc.addTrack(videoTrack, stream);
      }
    });

    if (!activeSocket) return;
  };

  const bindVideo = (stream: MediaStream | null) => (el: HTMLVideoElement | null) => {
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      // Only attempt to play if we haven't already explicitly tried in this render pass 
      // or if it's paused.
      if (el.paused) {
        const playPromise = el.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            if (err.name === 'NotAllowedError') {
              // Browser menge-block autoplay (karena blm ada interaksi user & video tidak di mute)
              // Tampilkan popup agar user bisa klik
              setShowAutoplayOverlay(true);
            }
          });
        }
      }
    } else if (el && !stream) {
      el.srcObject = null;
    }
  };

  const stopScreenShare = async () => {
    const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
    if (screenTrack) {
      Object.values(peerStateRef.current).forEach((state) => {
        const sender = state.pc.getSenders().find(s => s.track === screenTrack);
        if (sender) {
          try { state.pc.removeTrack(sender); } catch (e) { }
        }
      });
      screenTrack.stop();
    }
    screenStreamRef.current = null;
    setIsScreenSharing(false);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    const isAnyoneElseSharingScreen = Object.values(remoteStreams).some(streams => streams.length > 1);
    if (isAnyoneElseSharingScreen) {
      alert('Orang lain sedang melakukan presentasi. Anda tidak dapat share screen saat ini.');
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert('Browser tidak mendukung screen sharing.');
      return;
    }

    const shareAudio = window.confirm('Apakah Anda ingin membagikan suara (audio) dari layar juga?');

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: shareAudio
      });
      const screenTracks = screenStream.getTracks();
      if (screenTracks.length === 0) return;

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      const mainVideoTrack = screenStream.getVideoTracks()[0];
      if (mainVideoTrack) {
        mainVideoTrack.addEventListener('ended', () => {
          stopScreenShare();
        });
      }

      Object.values(peerStateRef.current).forEach((state) => {
        screenTracks.forEach(track => {
          state.pc.addTrack(track, screenStream);
        });
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  useEffect(() => {
    if (!meetingId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(meetingId);
    if (!isUuid) {
      const resolveRoomCode = async () => {
        try {
          const res = await fetch(`http://${window.location.hostname}:3000/meetings/code/${meetingId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            router.replace(`/meeting/${data.id}`);
          }
        } catch (e) {
          console.error(e);
        }
      };

      resolveRoomCode();
      return;
    }

    const newSocket = io(`ws://${window.location.hostname}:3000/meetings`, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      const initialMedia = mediaEnabledRef.current;
      // Send initial media state (sync with current local state)
      newSocket.emit('meeting:join', {
        meetingId,
        audioEnabled: initialMedia.audio,
        videoEnabled: initialMedia.video
      });
    });

    newSocket.on('meeting:state', async (data) => {
      setParticipants(data.participants);

      if (!Array.isArray(data.participants)) return;
      const others = data.participants
        .map((p: any) => p.socketId)
        .filter((id: string) => id && id !== newSocket.id);

      for (const targetId of others) {
        createPeerConnection(targetId, newSocket);
      }
    });

    newSocket.on('participant:joined', async (data) => {
      setParticipants(prev => {
        if (prev.find(p => p.socketId === data.socketId)) return prev;
        return [...prev, data];
      });

      refreshMeetingInfo();

      if (!data?.socketId || data.socketId === newSocket.id) return;
      createPeerConnection(data.socketId, newSocket);
    });

    newSocket.on('participant:left', (data) => {
      setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
      if (!data?.socketId) return;

      const state = peerStateRef.current[data.socketId];
      if (state) {
        state.pc.close();
        delete peerStateRef.current[data.socketId];
      }
      removeAllRemoteStreams(data.socketId);
      refreshMeetingInfo();
    });
    newSocket.on('webrtc:offer', async (payload) => {
      if (!payload?.from || payload.from === newSocket.id) return;

      const targetId = payload.from;
      const state = createPeerConnection(targetId, newSocket);
      const pc = state.pc;

      const offerCollision =
        state.makingOffer || pc.signalingState !== 'stable';

      state.ignoreOffer = !state.polite && offerCollision;
      if (state.ignoreOffer) return;

      state.isSettingRemoteAnswerPending = payload.sdp?.type === 'answer';
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      state.isSettingRemoteAnswerPending = false;

      if (payload.sdp?.type === 'offer') {
        await pc.setLocalDescription(await pc.createAnswer());
        newSocket.emit('webrtc:answer', {
          to: targetId,
          from: newSocket.id,
          sdp: pc.localDescription,
        });
      }

      if (state.pendingIce.length > 0) {
        const pending = [...state.pendingIce];
        state.pendingIce = [];
        await Promise.all(
          pending.map((candidate) => pc.addIceCandidate(candidate)),
        );
      }
    });

    newSocket.on('webrtc:answer', async (payload) => {
      if (!payload?.from) return;
      const state = peerStateRef.current[payload.from];
      if (!state) return;

      const pc = state.pc;
      if (pc.signalingState !== 'have-local-offer') return;

      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

      if (state.pendingIce.length > 0) {
        const pending = [...state.pendingIce];
        state.pendingIce = [];
        await Promise.all(
          pending.map((candidate) => pc.addIceCandidate(candidate)),
        );
      }
    });

    newSocket.on('webrtc:ice-candidate', async (payload) => {
      if (!payload?.from || !payload?.candidate) return;
      const state = peerStateRef.current[payload.from];
      if (!state) return;

      const pc = state.pc;
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.error(e);
        }
        return;
      }

      state.pendingIce.push(payload.candidate);
    });

    newSocket.on('chat:message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('meeting:ended', (data) => {
      const reason = data?.reason || 'Pertemuan telah diakhiri oleh host.';
      setMeetingEndedReason(reason);
      setMeetingEnded(true);
    });

    newSocket.on('meeting:kicked', (payload) => {
      const reason = payload?.reason || 'Anda dikeluarkan dari meeting.';
      alert(reason);
      router.push('/');
    });

    newSocket.on('media:force-mute', () => {
      if (mediaEnabledRef.current.audio) {
        toggleMedia('audio');
      }
    });

    newSocket.on('media:ask-unmute', () => {
      const agree = window.confirm('Host meminta Anda menyalakan mic. Nyalakan sekarang?');
      if (agree && !mediaEnabledRef.current.audio) {
        toggleMedia('audio');
      }
    });

    newSocket.on('hand:updated', (payload) => {
      if (!payload?.userId) return;
      setRaisedHands((prev) => ({
        ...prev,
        [payload.userId]: payload.raised,
      }));
    });

    newSocket.on('media:updated', (payload) => {
      if (!payload?.socketId) return;
      setParticipants((prev) => prev.map(p => {
        if (p.socketId === payload.socketId) {
          return {
            ...p,
            [payload.type === 'video' ? 'videoEnabled' : 'audioEnabled']: payload.enabled
          };
        }
        return p;
      }));
    });

    newSocket.on('participant:role-updated', (payload) => {
      if (!payload?.userId) return;
      setParticipants((prev) => prev.map((p) => {
        if (p.userId === payload.userId) {
          return { ...p, role: payload.role };
        }
        return p;
      }));
    });

    newSocket.on('media:speaking', (payload) => {
      if (!payload?.socketId) return;
      setSpeakingParticipants(prev => ({
        ...prev,
        [payload.socketId]: payload.speaking
      }));
    });

    newSocket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    setSocket(newSocket);

    // Fetch meeting details to know if we are the host and resolve names
    async function refreshMeetingInfo() {
      try {
        const res = await fetch(`http://${window.location.hostname}:3000/meetings/${meetingId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const participantUsers = (data.participants || []).reduce(
            (acc: Record<string, { name: string; avatarUrl?: string | null }>, participant: any) => {
              if (participant?.user?.id) {
                acc[participant.user.id] = {
                  name: participant.user.name || 'User',
                  avatarUrl: participant.user.avatarUrl ?? null,
                };
              }
              return acc;
            },
            {});

          if (data.host?.id) {
            participantUsers[data.host.id] = {
              name: data.host.name || 'Host',
              avatarUrl: data.host.avatarUrl ?? null,
            };
          }

          setMeetingInfo({
            title: data.title || 'Meeting',
            roomCode: data.roomCode || meetingId,
            hostName: data.host?.name || 'Host',
            hostId: data.host?.id || '',
            participantUsers,
          });
          // Check our own user id
          const meRes = await fetch(`http://${window.location.hostname}:3000/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            setCurrentUserId(meData.id);
            setIsHost(data.hostId === meData.id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    refreshMeetingInfo();

    return () => {
      newSocket.disconnect();
    };
  }, [meetingId, router]);

  const getAudioConstraint = () => {
    if (!selectedAudioDeviceId) return true;
    return { deviceId: { exact: selectedAudioDeviceId } };
  };

  const getVideoConstraint = () => {
    if (!selectedVideoDeviceId) return true;
    return { deviceId: { exact: selectedVideoDeviceId } };
  };

  const applyDeviceSelection = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;

      const nextStream = localStream ? new MediaStream(localStream.getTracks()) : new MediaStream();

      if (mediaEnabledRef.current.audio) {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: getAudioConstraint(),
          video: false,
        });
        const newAudioTrack = audioStream.getAudioTracks()[0];
        if (newAudioTrack) {
          nextStream.getAudioTracks().forEach((t) => {
            t.stop();
            nextStream.removeTrack(t);
          });
          nextStream.addTrack(newAudioTrack);
        }
      }

      if (mediaEnabledRef.current.video) {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: getVideoConstraint(),
        });
        const newVideoTrack = videoStream.getVideoTracks()[0];
        if (newVideoTrack) {
          nextStream.getVideoTracks().forEach((t) => {
            t.stop();
            nextStream.removeTrack(t);
          });
          nextStream.addTrack(newVideoTrack);
        }
      }

      setLocalStream(nextStream);
      await updatePeerConnectionsTracks(nextStream, socket);
    } catch (e) {
      console.error('Failed to apply device selection', e);
    }
  };

  useEffect(() => {
    if (!socket) return;
    if (!pendingMediaSyncRef.current) return;

    socket.emit('media:toggle', {
      meetingId,
      type: 'audio',
      enabled: mediaEnabledRef.current.audio,
    });
    socket.emit('media:toggle', {
      meetingId,
      type: 'video',
      enabled: mediaEnabledRef.current.video,
    });

    pendingMediaSyncRef.current = false;
  }, [socket, meetingId]);

  useEffect(() => {
    if (!meetingId || meetingEnded) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const checkMeeting = async () => {
      try {
        const res = await fetch(
          `http://${window.location.hostname}:3000/meetings/${meetingId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.status === 404) {
          setMeetingEndedReason('Pertemuan telah berakhir.');
          setMeetingEnded(true);
        }
      } catch (e) {
        console.error(e);
      }
    };

    checkMeeting();
    const poller = setInterval(checkMeeting, 15000);
    return () => clearInterval(poller);
  }, [meetingId, meetingEnded]);

  const toggleMedia = async (type: 'audio' | 'video') => {
    const newVideoState = type === 'video' ? !mediaEnabled.video : mediaEnabled.video;
    const newAudioState = type === 'audio' ? !mediaEnabled.audio : mediaEnabled.audio;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Browser tidak mendukung akses kamera/mic atau halaman tidak HTTPS.');
        return;
      }

      let stream = localStream;

      if (!stream) {
        if (newVideoState || newAudioState) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: newVideoState ? getVideoConstraint() : false,
            audio: newAudioState ? getAudioConstraint() : false,
          });
        }
      } else {
        if (type === 'audio') {
          const audioTrack = stream.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = newAudioState;
          } else if (newAudioState) {
            const audioStream = await navigator.mediaDevices.getUserMedia({
              audio: getAudioConstraint(),
              video: false,
            });
            stream.addTrack(audioStream.getAudioTracks()[0]);
          }
        } else if (type === 'video') {
          const videoTrack = stream.getVideoTracks()[0];
          if (newVideoState) {
            if (!videoTrack) {
              const videoStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: getVideoConstraint(),
              });
              stream.addTrack(videoStream.getVideoTracks()[0]);
            } else {
              videoTrack.enabled = true;
            }
          } else {
            if (videoTrack) {
              videoTrack.stop();
              stream.removeTrack(videoTrack);
            }
          }
        }
      }

      setLocalStream(stream);
      setMediaEnabled({ video: newVideoState, audio: newAudioState });
      await updatePeerConnectionsTracks(stream, socket);

      if (socket) {
        socket.emit('media:toggle', { meetingId, type, enabled: type === 'video' ? newVideoState : newAudioState });
      } else {
        pendingMediaSyncRef.current = true;
      }
    } catch (err) {
      console.error('Error accessing media devices.', err);
      alert('Gagal mengakses kamera/mic.');
    }
  };

  const toggleHandRaise = () => {
    const nextValue = !isHandRaised;
    setIsHandRaised(nextValue);

    if (currentUserId) {
      setRaisedHands((prev) => ({
        ...prev,
        [currentUserId]: nextValue,
      }));
    }

    if (socket) {
      socket.emit('hand:toggle', { meetingId, raised: nextValue });
    }
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (socket && chatInput.trim()) {
      socket.emit('chat:message', { meetingId, message: chatInput });
      setChatInput('');
    }
  };

  if (!meetingId) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>No Meeting ID provided.</h2>
        <button onClick={() => router.push('/')}>Back to Home</button>
      </main>
    );
  }

  const handleCopyId = () => {
    if (meetingId) {
      navigator.clipboard.writeText(meetingId);
      alert('Meeting ID copied to clipboard!');
    }
  };

  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const colors = {
    bgApp: '#ffffff',
    bgBottomBar: '#858a93',
    bgDarkNavy: '#212a3e',
    bgSidebar: '#e4e6ea',
    bgActiveTab: '#175073',
    red: '#ff5c5c',
    blueHighlight: '#00d2ff',
    chatReceived: '#8f95a3',
    chatSent: '#2a6a8b',
    chatInputBg: '#7e838f',
  };

  // Combine local user with remote participants (filtering out our own socket connection)
  const remoteParticipants = participants.filter(p => p.socketId !== socket?.id);
  const participantUserIdBySocketId = participants.reduce((acc: Record<string, string>, participant: any) => {
    if (participant?.socketId && participant?.userId) {
      acc[participant.socketId] = participant.userId;
    }
    return acc;
  }, {});

  const displayParticipants = [
    { isLocal: true, name: 'Anda', id: 'local' },
    ...remoteParticipants.map(p => ({ isLocal: false, name: p.user?.name || `User ${p.socketId?.substring(0, 5)}`, id: p.socketId }))
  ];

  type DisplayItem = {
    isLocal: boolean;
    name: string;
    id: string;
    originalId?: string;
    type: 'camera' | 'screen';
    stream?: MediaStream;
    videoEnabled?: boolean;
    audioEnabled?: boolean;
  };

  const displayItems: DisplayItem[] = [];

  // Add local camera
  displayItems.push({ isLocal: true, name: 'Anda', id: 'local', type: 'camera' });
  // Add local screen share if active
  if (isScreenSharing) {
    displayItems.push({ isLocal: true, name: 'Anda (Presentasi)', id: 'local-screen', type: 'screen' });
  }

  remoteParticipants.forEach(p => {
    const streams = remoteStreams[p.socketId] || [];
    const resolvedName = meetingInfo?.participantUsers?.[p.userId]?.name || p.user?.name || `User ${p.socketId?.substring(0, 5)}`;
    displayItems.push({
      isLocal: false,
      name: resolvedName,
      id: p.socketId,
      originalId: p.socketId,
      type: 'camera',
      stream: streams[0],
      videoEnabled: p.videoEnabled,
      audioEnabled: p.audioEnabled
    });

    if (streams.length > 1) {
      const screenStream = streams[1];
      const screenTrack = screenStream?.getVideoTracks?.()[0];
      const isScreenLive = Boolean(screenTrack && screenTrack.readyState === 'live');
      if (!isScreenLive) return;
      displayItems.push({
        isLocal: false,
        name: resolvedName + ' (Presentasi)',
        id: p.socketId + '-screen',
        originalId: p.socketId,
        type: 'screen',
        stream: screenStream
      });
    }
  });

  const screenShareItem = displayItems.find(item => item.type === 'screen') || null;
  const nonScreenItems = displayItems.filter(item => item.type !== 'screen');
  const hasScreenShare = Boolean(screenShareItem);

  const getCardStyle = (isSingle: boolean, isGrid: boolean) => {
    if (!isGrid) {
      return {
        flex: '1 1 100%',
        maxWidth: 'calc((100vh - 120px) * 16 / 9)',
        maxHeight: '100%'
      };
    }

    return {
      flex: isSingle ? '1 1 100%' : '1 1 calc(50% - 0.5rem)',
      maxWidth: isSingle ? 'calc((100vh - 120px) * 16 / 9)' : 'calc((100vh - 120px) * 16 / 9 / 2)',
      maxHeight: isSingle ? '100%' : 'calc(50% - 0.5rem)'
    };
  };

  return (
    <main style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: colors.bgApp, overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      <style>{mobileStyles}</style>
      {meetingEnded && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }}>
            <h2 style={{ margin: '0 0 0.75rem 0', color: '#202124' }}>Meeting ended</h2>
            <p style={{ margin: '0 0 1.5rem 0', color: '#5f6368' }}>{meetingEndedReason || 'Pertemuan telah berakhir.'}</p>
            <button onClick={() => router.push('/')} style={{ background: '#1a73e8', color: 'white', border: 'none', borderRadius: '999px', padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Kembali ke Home</button>
          </div>
        </div>
      )}
      {isInfoOpen && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 45, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '14px', width: '90%', maxWidth: '360px', boxShadow: '0 12px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#202124' }}>Info Meeting</h3>
              <button onClick={() => setIsInfoOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }} aria-label="Close info">
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: '#3c4043' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#5f6368' }}>Nama meeting</div>
                <div style={{ fontWeight: 600 }}>{meetingInfo?.title || 'Meeting'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#5f6368' }}>Code meeting</div>
                <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{meetingInfo?.roomCode || meetingId}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {isDeviceSettingsOpen && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '14px', width: '92%', maxWidth: '420px', boxShadow: '0 12px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#202124' }}>Device Settings</h3>
              <button onClick={() => setIsDeviceSettingsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }} aria-label="Close device settings">
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#3c4043' }}>
                <span style={{ fontSize: '0.75rem', color: '#5f6368' }}>Microphone</span>
                <select
                  value={selectedAudioDeviceId}
                  onChange={(e) => setSelectedAudioDeviceId(e.target.value)}
                  style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #dadce0', fontSize: '0.9rem' }}
                >
                  {audioDevices.length === 0 && <option value="">No microphone detected</option>}
                  {audioDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#3c4043' }}>
                <span style={{ fontSize: '0.75rem', color: '#5f6368' }}>Camera</span>
                <select
                  value={selectedVideoDeviceId}
                  onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
                  style={{ padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid #dadce0', fontSize: '0.9rem' }}
                >
                  {videoDevices.length === 0 && <option value="">No camera detected</option>}
                  {videoDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsDeviceSettingsOpen(false)}
                  style={{ background: '#e5e7eb', border: 'none', color: '#111827', borderRadius: '10px', padding: '0.6rem 1rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await applyDeviceSelection();
                    setIsDeviceSettingsOpen(false);
                  }}
                  style={{ background: '#1a73e8', border: 'none', color: 'white', borderRadius: '10px', padding: '0.6rem 1rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (Takes remaining space above bottom bar) */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', width: '100%', overflow: 'hidden' }}>

        {/* Video Grid Area */}
        <div className="video-grid-container" style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}>
          {hasScreenShare ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', gap: '1rem', alignItems: 'stretch', justifyContent: 'center' }}>
              <div style={{ flex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {[screenShareItem].map((p: any) => {
                  const originalId = p.originalId || p.id;
                  const participantUserId = p.isLocal ? currentUserId : participantUserIdBySocketId[originalId];
                  const showHand = participantUserId && p.type === 'camera' ? raisedHands[participantUserId] : false;
                  const isVideoEnabled = true;
                  const isAudioEnabled = true;
                  const isSpeaking = (p.isLocal ? speakingParticipants['local'] : speakingParticipants[originalId]) && p.type === 'camera';

                  return (
                    <div key={p.id} className="participant-card" style={{
                      position: 'relative',
                      background: colors.bgDarkNavy,
                      borderRadius: '24px',
                      overflow: 'hidden',
                      flex: '1 1 100%',
                      maxWidth: 'calc((100vh - 120px) * 16 / 9)',
                      maxHeight: '100%',
                      aspectRatio: '16/9',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: isSpeaking ? `3px solid ${colors.blueHighlight}` : '3px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }}>
                      {p.isLocal ? (
                        <video
                          ref={bindVideo(screenStreamRef.current)}
                          autoPlay
                          muted
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <video
                          ref={bindVideo(p.stream || null)}
                          autoPlay
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      )}

                      {p.type === 'camera' && !isAudioEnabled && (
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                          <MicOff size={16} color={colors.red} />
                        </div>
                      )}

                      {showHand && (
                        <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                          <span style={{ fontSize: '18px', lineHeight: 1 }}>✋</span>
                        </div>
                      )}

                      <div className="name-badge-container" style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
                        <div className="name-badge" style={{ color: 'white', background: 'rgba(0,0,0,0.4)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.875rem', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'stretch', justifyContent: 'center' }}>
                {nonScreenItems.map((p: any, index) => {
                  const isSingle = nonScreenItems.length === 1;
                  const originalId = p.originalId || p.id;
                  const participantUserId = p.isLocal ? currentUserId : participantUserIdBySocketId[originalId];
                  const showHand = participantUserId && p.type === 'camera' ? raisedHands[participantUserId] : false;
                  const remoteVideoTrack = !p.isLocal && p.type === 'camera' ? p.stream?.getVideoTracks()?.[0] : null;
                  const remoteAudioTrack = !p.isLocal && p.type === 'camera' ? p.stream?.getAudioTracks()?.[0] : null;
                  const isRemoteVideoLive = Boolean(
                    remoteVideoTrack && remoteVideoTrack.readyState === 'live' && remoteVideoTrack.enabled,
                  );
                  const isRemoteAudioLive = Boolean(
                    remoteAudioTrack && remoteAudioTrack.readyState === 'live' && remoteAudioTrack.enabled,
                  );
                  const isVideoEnabled = p.isLocal
                    ? mediaEnabled.video
                    : p.videoEnabled !== undefined
                      ? p.videoEnabled
                      : isRemoteVideoLive;
                  const isAudioEnabled = p.isLocal
                    ? mediaEnabled.audio
                    : p.audioEnabled !== undefined
                      ? p.audioEnabled
                      : isRemoteAudioLive;
                  const isSpeaking = (p.isLocal ? speakingParticipants['local'] : speakingParticipants[originalId]) && p.type === 'camera';

                  return (
                    <div key={p.id} className="participant-card" style={{
                      position: 'relative',
                      background: colors.bgDarkNavy,
                      borderRadius: '24px',
                      overflow: 'hidden',
                      flex: isSingle ? '1 1 100%' : '1 1 auto',
                      aspectRatio: '16/9',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: isSpeaking ? `3px solid ${colors.blueHighlight}` : '3px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }}>
                      {p.isLocal ? (
                        p.type === 'screen' ? (
                          <video
                            ref={bindVideo(screenStreamRef.current)}
                            autoPlay
                            muted
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <>
                            <video
                              ref={bindVideo(localStream)}
                              autoPlay
                              muted
                              playsInline
                              style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleX(-1)', display: isVideoEnabled ? 'block' : 'none' }}
                            />
                            {!isVideoEnabled && (
                              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#31415e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '1px solid #475a7c' }}>
                                Anda
                              </div>
                            )}
                          </>
                        )
                      ) : (
                        p.type === 'screen' ? (
                          <video
                            ref={bindVideo(p.stream || null)}
                            autoPlay
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <>
                            <video
                              ref={bindVideo(p.stream || null)}
                              autoPlay
                              playsInline
                              style={{ width: '100%', height: '100%', objectFit: 'contain', display: p.stream && isVideoEnabled ? 'block' : 'none' }}
                            />
                            {(!p.stream || !isVideoEnabled) && (
                              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#31415e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '1px solid #475a7c' }}>
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </>
                        )
                      )}

                      {p.type === 'camera' && !isAudioEnabled && (
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                          <MicOff size={16} color={colors.red} />
                        </div>
                      )}

                      {showHand && (
                        <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                          <span style={{ fontSize: '18px', lineHeight: 1 }}>✋</span>
                        </div>
                      )}

                      <div className="name-badge-container" style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
                        <div className="name-badge" style={{ color: 'white', background: 'rgba(0,0,0,0.4)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.875rem', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignContent: 'center', justifyContent: 'center' }}>

              {/* Participant Cards */}
              {displayItems.map((p: any, index) => {
                const isFirst = index === 0;
                const isSingle = displayItems.length === 1;
                const originalId = p.originalId || p.id;
                const participantUserId = p.isLocal ? currentUserId : participantUserIdBySocketId[originalId];
                const showHand = participantUserId && p.type === 'camera' ? raisedHands[participantUserId] : false;
                const remoteVideoTrack = !p.isLocal && p.type === 'camera' ? p.stream?.getVideoTracks()?.[0] : null;
                const remoteAudioTrack = !p.isLocal && p.type === 'camera' ? p.stream?.getAudioTracks()?.[0] : null;
                const isRemoteVideoLive = Boolean(
                  remoteVideoTrack && remoteVideoTrack.readyState === 'live' && remoteVideoTrack.enabled,
                );
                const isRemoteAudioLive = Boolean(
                  remoteAudioTrack && remoteAudioTrack.readyState === 'live' && remoteAudioTrack.enabled,
                );
                const isVideoEnabled = p.isLocal
                  ? mediaEnabled.video
                  : p.videoEnabled !== undefined
                    ? p.videoEnabled
                    : isRemoteVideoLive;
                const isAudioEnabled = p.isLocal
                  ? mediaEnabled.audio
                  : p.audioEnabled !== undefined
                    ? p.audioEnabled
                    : isRemoteAudioLive;
                const isSpeaking = (p.isLocal ? speakingParticipants['local'] : speakingParticipants[originalId]) && p.type === 'camera';

                return (
                  <div key={p.id} className="participant-card" style={{
                    position: 'relative',
                    background: colors.bgDarkNavy,
                    borderRadius: '24px',
                    overflow: 'hidden',
                    ...getCardStyle(isSingle, isGridView),
                    aspectRatio: '16/9',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: isSpeaking ? `3px solid ${colors.blueHighlight}` : '3px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                  }}>

                    {p.isLocal ? (
                      p.type === 'screen' ? (
                        <video
                          ref={bindVideo(screenStreamRef.current)}
                          autoPlay
                          muted
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <>
                          <video
                            ref={bindVideo(localStream)}
                            autoPlay
                            muted
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleX(-1)', display: isVideoEnabled ? 'block' : 'none' }}
                          />
                          {!isVideoEnabled && (
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#31415e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '1px solid #475a7c' }}>
                              Anda
                            </div>
                          )}
                        </>
                      )
                    ) : (
                      p.type === 'screen' ? (
                        <video
                          ref={bindVideo(p.stream || null)}
                          autoPlay
                          playsInline
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <>
                          <video
                            ref={bindVideo(p.stream || null)}
                            autoPlay
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: p.stream && isVideoEnabled ? 'block' : 'none' }}
                          />
                          {(!p.stream || !isVideoEnabled) && (
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#31415e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '1px solid #475a7c' }}>
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </>
                      )
                    )}

                    {/* Mute Icon top right */}
                    {p.type === 'camera' && !isAudioEnabled && (
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <MicOff size={16} color={colors.red} />
                      </div>
                    )}

                    {/* Raise Hand Icon top left */}
                    {showHand && (
                      <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <span style={{ fontSize: '18px', lineHeight: 1 }}>✋</span>
                      </div>
                    )}

                    {/* Name Badge bottom left */}
                    <div className="name-badge-container" style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
                      <div className="name-badge" style={{ color: 'white', background: 'rgba(0,0,0,0.4)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.875rem', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          )}
        </div>

        {/* Sidebar */}
        {activeTab && (
          <div className="sidebar-container" style={{ width: '360px', background: 'linear-gradient(180deg, #f7f8fb 0%, #eef1f6 100%)', color: '#2b2f38', display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(0,0,0,0.06)', flexShrink: 0, zIndex: 10, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)', borderTopLeftRadius: '24px', borderBottomLeftRadius: '24px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', padding: '1.1rem 1.25rem', alignItems: 'center', gap: '0.75rem', background: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ flex: 1, background: '#e9edf5', borderRadius: '999px', display: 'flex', padding: '0.25rem', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)' }}>
                <button onClick={() => setActiveTab('people')} style={{ flex: 1, background: activeTab === 'people' ? '#1f3b64' : 'transparent', color: activeTab === 'people' ? 'white' : '#53627a', border: 'none', borderRadius: '999px', padding: '0.55rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.01em' }}>
                  <Users size={20} />
                  <span style={{ fontSize: '0.75rem' }}>People</span>
                </button>
                <button onClick={() => setActiveTab('chat')} style={{ flex: 1, background: activeTab === 'chat' ? '#1f3b64' : 'transparent', color: activeTab === 'chat' ? 'white' : '#53627a', border: 'none', borderRadius: '999px', padding: '0.55rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.01em' }}>
                  <MessageSquare size={20} />
                  <span style={{ fontSize: '0.75rem' }}>Chat</span>
                </button>
              </div>
              <button onClick={() => setActiveTab(null)} style={{ background: '#eef2f7', border: 'none', cursor: 'pointer', color: '#6b7280', width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={24} />
              </button>
            </div>

            {/* Chat Content */}
            {activeTab === 'chat' && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {messages.map((m, i) => {
                    const isMe = m.senderId === localStorage.getItem('token'); // Simplification for demo
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '12px', background: '#1f3b64', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.875rem', boxShadow: '0 4px 10px rgba(15, 23, 42, 0.15)' }}>
                          {m.sender?.name?.charAt(0) || 'U'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                            {isMe ? (
                              <>
                                <span style={{ fontSize: '0.75rem', color: '#8f95a3' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <strong style={{ fontSize: '0.875rem', color: '#4a4d55' }}>Anda</strong>
                              </>
                            ) : (
                              <>
                                <strong style={{ fontSize: '0.875rem', color: '#4a4d55' }}>{m.sender?.name || `User ${m.senderId?.substring(0, 5)}`}</strong>
                                <span style={{ fontSize: '0.75rem', color: '#8f95a3' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </>
                            )}
                          </div>
                          <div style={{ background: isMe ? '#214e6f' : '#6f7686', color: 'white', padding: '0.75rem 1rem', borderRadius: '16px', borderTopRightRadius: isMe ? '6px' : '16px', borderTopLeftRadius: !isMe ? '6px' : '16px', fontSize: '0.875rem', lineHeight: '1.5', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.12)' }}>
                            {m.message}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <form onSubmit={sendChat} style={{ padding: '1rem 1.25rem 1.5rem' }}>
                  <div style={{ background: '#ffffff', borderRadius: '16px', display: 'flex', alignItems: 'center', padding: '0.5rem 0.75rem 0.5rem 1rem', boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ketik pesan..."
                      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#111827', fontSize: '0.9rem' }}
                    />
                    <button type="submit" disabled={!chatInput.trim()} style={{ background: chatInput.trim() ? '#1f3b64' : '#e5e7eb', border: 'none', cursor: chatInput.trim() ? 'pointer' : 'default', color: chatInput.trim() ? 'white' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '12px' }}>
                      <Send size={20} />
                    </button>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.65rem', color: '#8f95a3' }}>
                    Pesan hanya dapat dilihat oleh peserta dalam panggilan
                  </div>
                </form>
              </>
            )}

            {/* Other Tabs */}
            {activeTab === 'people' && (
              <div style={{ padding: '1rem 1.25rem 1.5rem', flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>Participants ({participants.length})</span>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="text"
                    value={peopleSearch}
                    onChange={(e) => setPeopleSearch(e.target.value)}
                    placeholder="Find a participant"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '0.85rem', outline: 'none', background: '#ffffff' }}
                  />
                </div>
                {participants.length === 0 && <p style={{ color: '#8f95a3', fontSize: '0.875rem', marginTop: '1rem' }}>Menunggu orang lain bergabung...</p>}
                {[...participants]
                  .sort((a, b) => {
                    const isAHost = meetingInfo?.hostId === a.userId;
                    const isBHost = meetingInfo?.hostId === b.userId;
                    if (isAHost) return -1;
                    if (isBHost) return 1;

                    const isARaised = raisedHands[a.userId];
                    const isBRaised = raisedHands[b.userId];
                    if (isARaised && !isBRaised) return -1;
                    if (!isARaised && isBRaised) return 1;

                    return 0;
                  })
                  .filter((p) => {
                    if (!peopleSearch.trim()) return true;
                    const resolvedName = meetingInfo?.participantUsers?.[p.userId]?.name;
                    const name = resolvedName || `User ${p.userId?.substring(0, 5)}`;
                    return name.toLowerCase().includes(peopleSearch.trim().toLowerCase());
                  })
                  .map((p, i) => {
                    const resolvedName = meetingInfo?.participantUsers?.[p.userId]?.name;
                    const name = resolvedName || `User ${p.userId?.substring(0, 5)}`;
                    const isMe = currentUserId && p.userId === currentUserId;
                    const isHostLabel = meetingInfo?.hostId && p.userId === meetingInfo.hostId;
                    const isCoHostLabel = p.role === 'CO_HOST';
                    const isRaised = raisedHands[p.userId];
                    const audioEnabled = isMe ? mediaEnabled.audio : p.audioEnabled;
                    const videoEnabled = isMe ? mediaEnabled.video : p.videoEnabled;
                    const myParticipant =
                      participants.find((participant) => participant.socketId === socket?.id) ||
                      (currentUserId ? participants.find((participant) => participant.userId === currentUserId) : undefined);
                    const myRole = myParticipant?.role;
                    const canManageParticipant =
                      !isMe &&
                      (myRole === 'HOST' || (myRole === 'CO_HOST' && !isHostLabel));

                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1f3b64', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
                            {isMe ? 'Anda (You)' : name}{isHostLabel ? ' (Host)' : ''}{isCoHostLabel ? ' (Co-Host)' : ''}
                          </span>
                          {isRaised && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>✋ Raised hand</span>}
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
                          {audioEnabled ? <Mic size={16} color="#16a34a" /> : <MicOff size={16} color="#ef4444" />}
                          {videoEnabled ? <Video size={16} color="#16a34a" /> : <VideoOff size={16} color="#ef4444" />}
                          {canManageParticipant && (
                            <>
                              <button
                                onClick={() => setOpenParticipantMenuUserId((prev) => (prev === p.userId ? null : p.userId))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                aria-label="Participant actions"
                                data-participant-menu-button="true"
                              >
                                <MoreVertical size={16} />
                              </button>
                              {openParticipantMenuUserId === p.userId && (
                                <div data-participant-menu="true" style={{ position: 'absolute', right: 0, top: '28px', background: '#111827', color: 'white', borderRadius: '10px', padding: '0.5rem', minWidth: '170px', boxShadow: '0 12px 28px rgba(0,0,0,0.3)', zIndex: 20 }}>
                                  {!isHostLabel && (
                                    <button onClick={() => {
                                      if (socket) socket.emit('meeting:kick', { meetingId, targetSocketId: p.socketId });
                                      setOpenParticipantMenuUserId(null);
                                    }} style={{ background: 'none', border: 'none', color: 'white', padding: '0.5rem 0.6rem', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                                      Kick participant
                                    </button>
                                  )}
                                  {audioEnabled ? (
                                    <button onClick={() => {
                                      if (socket) socket.emit('media:force-mute', { meetingId, targetSocketId: p.socketId });
                                      setOpenParticipantMenuUserId(null);
                                    }} style={{ background: 'none', border: 'none', color: 'white', padding: '0.5rem 0.6rem', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                                      Mute user
                                    </button>
                                  ) : (
                                    <button onClick={() => {
                                      if (socket) socket.emit('media:ask-unmute', { meetingId, targetSocketId: p.socketId });
                                      setOpenParticipantMenuUserId(null);
                                    }} style={{ background: 'none', border: 'none', color: 'white', padding: '0.5rem 0.6rem', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                                      Ask to unmute
                                    </button>
                                  )}
                                  {isHost && !isCoHostLabel && (
                                    <button onClick={() => {
                                      if (socket) socket.emit('meeting:make-cohost', { meetingId, targetUserId: p.userId });
                                      setOpenParticipantMenuUserId(null);
                                    }} style={{ background: 'none', border: 'none', color: 'white', padding: '0.5rem 0.6rem', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                                      Make co-host
                                    </button>
                                  )}
                                  {isHost && isCoHostLabel && (
                                    <button onClick={() => {
                                      if (socket) socket.emit('meeting:remove-cohost', { meetingId, targetUserId: p.userId });
                                      setOpenParticipantMenuUserId(null);
                                    }} style={{ background: 'none', border: 'none', color: 'white', padding: '0.5rem 0.6rem', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                                      Remove co-host
                                    </button>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="bottom-bar" style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: colors.bgBottomBar, color: '#f1f3f4', flexShrink: 0, zIndex: 20 }}>

        <div className="bottom-bar-info" style={{ width: '250px', fontSize: '1rem', fontWeight: 500, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span>{currentTime}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', background: 'rgba(0,0,0,0.35)', padding: '0.2rem 0.6rem', borderRadius: '999px', color: '#f1f3f4' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#22c55e' : '#eab308' }}></span>
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>

        <div className="controls-container" style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => toggleMedia('audio')} className="control-btn" style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: mediaEnabled.audio ? colors.bgDarkNavy : colors.bgDarkNavy, color: mediaEnabled.audio ? 'white' : colors.red, transition: 'all 0.2s' }}>
            {mediaEnabled.audio ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button onClick={() => toggleMedia('video')} className="control-btn" style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: mediaEnabled.video ? colors.bgDarkNavy : colors.bgDarkNavy, color: mediaEnabled.video ? 'white' : colors.red, transition: 'all 0.2s' }}>
            {mediaEnabled.video ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
          <button onClick={() => setIsGridView((prev) => !prev)} className="control-btn" style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isGridView ? colors.bgDarkNavy : '#0f4c75', color: 'white', transition: 'all 0.2s' }}>
            <LayoutGrid size={20} />
          </button>
          <button onClick={toggleHandRaise} className="control-btn" style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isHandRaised ? '#0f4c75' : colors.bgDarkNavy, color: 'white', transition: 'all 0.2s' }}>
            {isHandRaised ? <Hand size={20} /> : <Hand size={20} />}
          </button>
          <button onClick={toggleScreenShare} className="control-btn" style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isScreenSharing ? '#0f4c75' : colors.bgDarkNavy, color: 'white', transition: 'all 0.2s' }}>
            <MonitorUp size={20} />
          </button>
          <button onClick={() => setIsDeviceSettingsOpen(true)} className="control-btn" style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.bgDarkNavy, color: 'white', transition: 'all 0.2s' }}>
            <MoreVertical size={20} />
          </button>
        </div>

        <div className="bottom-bar-actions" style={{ width: '250px', display: 'flex', justifyContent: 'flex-end', gap: '1rem', color: '#e4e6ea', position: 'relative' }}>
          <button onClick={() => setIsInfoOpen(true)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><Info size={20} /></button>
          <button onClick={() => setActiveTab(activeTab === 'people' ? null : 'people')} style={{ position: 'relative', background: 'none', border: 'none', color: activeTab === 'people' ? colors.bgActiveTab : 'inherit', cursor: 'pointer' }}>
            <Users size={20} />
            <span style={{ position: 'absolute', top: '-6px', right: '-8px', background: '#8ab4f8', color: '#202124', fontSize: '0.6rem', fontWeight: 'bold', width: '14px', height: '14px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {displayParticipants.length}
            </span>
          </button>
          <button onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')} style={{ background: 'none', border: 'none', color: activeTab === 'chat' ? colors.bgActiveTab : 'inherit', cursor: 'pointer' }}><MessageSquare size={20} /></button>
          <button onClick={() => setIsLeaveMenuOpen((prev) => !prev)} title="Leave options" className="leave-btn" style={{ background: colors.red, border: 'none', color: 'white', cursor: 'pointer', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PhoneOff size={20} />
          </button>
          {isLeaveMenuOpen && (
            <div style={{ position: 'absolute', right: 0, bottom: '46px', background: '#1f2937', color: 'white', padding: '0.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '160px', boxShadow: '0 10px 24px rgba(0,0,0,0.3)' }}>
              {isHost && (
                <button onClick={() => {
                  if (window.confirm('Akhiri pertemuan untuk semua orang? (Room akan dihapus)')) {
                    if (socket) socket.emit('meeting:end', { meetingId });
                  }
                  setIsLeaveMenuOpen(false);
                }} style={{ background: '#dc2626', border: 'none', color: 'white', borderRadius: '10px', padding: '0.5rem 0.75rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  End Meeting
                </button>
              )}
              <button onClick={() => {
                setIsLeaveMenuOpen(false);
                router.push('/');
              }} style={{ background: '#374151', border: 'none', color: 'white', borderRadius: '10px', padding: '0.5rem 0.75rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                Leave Meeting
              </button>
            </div>
          )}
        </div>

      </div>
      {showAutoplayOverlay && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', textAlign: 'center', padding: '2rem' }}
        >
          <div style={{ background: colors.bgDarkNavy, padding: '2.5rem', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', maxWidth: '400px', width: '100%' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(138, 180, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.blueHighlight }}>
              <Video size={32} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>Siap untuk Bergabung?</h2>
              <p style={{ margin: 0, color: '#8f95a3', fontSize: '0.875rem', lineHeight: '1.5' }}>Browser memblokir suara otomatis. Klik tombol di bawah untuk mengaktifkan audio dan video.</p>
            </div>
            <button
              onClick={async (event) => {
                event.stopPropagation();
                const videos = document.querySelectorAll('video');
                let playedAny = false;
                for (const v of Array.from(videos)) {
                  if (v.srcObject) {
                    try {
                      await v.play();
                      playedAny = true;
                    } catch (e) {
                      console.error('Failed to play video on overlay click', e);
                    }
                  }
                }
                if (playedAny) {
                  setShowAutoplayOverlay(false);
                }
              }}
              style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: 'none', background: colors.blueHighlight, color: 'white', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', transition: 'transform 0.2s' }}
            >
              Masuk ke Rapat
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
