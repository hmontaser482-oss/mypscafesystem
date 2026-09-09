import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { playSessionStart, playSessionEnd, playWarning } from '../utils/audioEffects';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [liveTicks, setLiveTicks] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Connect to same origin (proxied by Vite to port 5001)
    const newSocket = io({
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    // Real-time periodic ticks for active sessions
    newSocket.on('sessions:tick', (updates) => {
      const map = {};
      updates.forEach(u => {
        map[u.deviceId] = u;
        map[u.sessionId] = u;
      });
      setLiveTicks(prev => ({ ...prev, ...map }));
    });

    // Sound and alert triggers
    newSocket.on('session:started', () => {
      playSessionStart();
    });

    newSocket.on('session:ended', () => {
      playSessionEnd();
    });

    newSocket.on('notification:new', (notif) => {
      playWarning();
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, liveTicks, notifications, unreadCount, setUnreadCount }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
