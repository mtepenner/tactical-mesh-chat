import { useState, useEffect, useCallback, useRef } from 'react';

export interface MeshNode {
  id: string;
  name: string;
  rssi: number;
  lastSeen: number;
}

export interface MeshMessage {
  packetId: number;
  senderId: number;
  type: 'text' | 'gps';
  payload: string;
  timestamp: number;
}

export interface UseMeshBluetoothReturn {
  isConnected: boolean;
  nodes: MeshNode[];
  messages: MeshMessage[];
  connect: (host: string, port: number) => void;
  disconnect: () => void;
  sendMessage: (payload: string) => boolean;
  error: string | null;
}

const MAX_MESSAGES = 200;

function generatePacketId(): number {
  return Math.floor(Math.random() * 0xFFFFFFFF);
}

function parseMeshFrame(data: Uint8Array): MeshMessage | null {
  // Wire format: [Version(1)][PacketID(4)][SenderID(4)][TTL(1)][Type(1)][PayloadLen(2)][Payload(N)]
  if (data.length < 13) return null;

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  const _version = data[offset++];
  const packetId = view.getUint32(offset, false); offset += 4;
  const senderId = view.getUint32(offset, false); offset += 4;
  const _ttl = data[offset++];
  const type = data[offset++];
  const payloadLen = view.getUint16(offset, false); offset += 2;

  if (offset + payloadLen > data.length) return null;

  const payloadBytes = data.slice(offset, offset + payloadLen);
  const payload = new TextDecoder().decode(payloadBytes);

  return {
    packetId,
    senderId,
    type: type === 0 ? 'text' : 'gps',
    payload,
    timestamp: Date.now(),
  };
}

export function useMeshBluetooth(): UseMeshBluetoothReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [nodes, setNodes] = useState<MeshNode[]>([]);
  const [messages, setMessages] = useState<MeshMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const frameBufferRef = useRef<number[]>([]);
  const inFrameRef = useRef(false);

  const processIncomingByte = useCallback((byte: number) => {
    const FRAME_START = 0xAA;
    const FRAME_END = 0x55;

    if (byte === FRAME_START && !inFrameRef.current) {
      inFrameRef.current = true;
      frameBufferRef.current = [];
    } else if (byte === FRAME_END && inFrameRef.current) {
      inFrameRef.current = false;
      const frameData = new Uint8Array(frameBufferRef.current);
      const msg = parseMeshFrame(frameData);
      if (msg) {
        setMessages(prev => {
          const next = [...prev, msg];
          return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
        });
      }
    } else if (inFrameRef.current) {
      frameBufferRef.current.push(byte);
      if (frameBufferRef.current.length > 300) {
        inFrameRef.current = false;
        frameBufferRef.current = [];
      }
    }
  }, []);

  const connect = useCallback((host: string, port: number) => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    const url = `ws://${host}:${port}`;
    setError(null);

    try {
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      ws.onerror = () => {
        setError(`Failed to connect to ${url}`);
        setIsConnected(false);
      };

      ws.onmessage = (event: WebSocketMessageEvent) => {
        const data = new Uint8Array(event.data as ArrayBuffer);
        for (let i = 0; i < data.length; i++) {
          processIncomingByte(data[i]);
        }
      };

      socketRef.current = ws;
    } catch (e) {
      setError(`Connection error: ${String(e)}`);
    }
  }, [processIncomingByte]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((payload: string): boolean => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    const payloadBytes = new TextEncoder().encode(payload);
    // Wire format: [Version(1)][PacketID(4)][SenderID(4)][TTL(1)][Type(1)][PayloadLen(2)][Payload(N)]
    const totalLen = 1 + 4 + 4 + 1 + 1 + 2 + payloadBytes.length;
    const buf = new ArrayBuffer(totalLen + 2); // +2 for frame markers
    const view = new DataView(buf);
    const arr = new Uint8Array(buf);

    let offset = 0;
    arr[offset++] = 0xBB; // gateway frame marker: hub forwards this payload to the serial port
    // The hub expects a 2-byte big-endian length prefix
    view.setUint16(offset, totalLen, false); offset += 2;

    // Build packet
    view.setUint8(offset++, 1); // version
    view.setUint32(offset, generatePacketId(), false); offset += 4;
    view.setUint32(offset, 0xDEADBEEF, false); offset += 4; // own sender ID
    view.setUint8(offset++, 7); // TTL
    view.setUint8(offset++, 0); // type: text
    view.setUint16(offset, payloadBytes.length, false); offset += 2;
    arr.set(payloadBytes, offset);

    try {
      socketRef.current.send(buf);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Simulate node discovery for UI (in real app, this comes from mesh beacons)
  useEffect(() => {
    if (!isConnected) {
      setNodes([]);
      return;
    }
    const timer = setInterval(() => {
      setNodes(prev => {
        const now = Date.now();
        return prev
          .map(n => ({ ...n, rssi: n.rssi + Math.floor(Math.random() * 5) - 2 }))
          .filter(n => now - n.lastSeen < 30000);
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [isConnected]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return { isConnected, nodes, messages, connect, disconnect, sendMessage, error };
}
