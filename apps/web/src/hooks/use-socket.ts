'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export function useSocket() {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = (session?.user as any)?.accessToken;
    if (!token) return;

    const socket = io(`${WS_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('notification', (notification: any) => {
      // Invalidate notifications query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, { body: notification.body });
      }
    });

    socket.on('dealUpdate', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['deal', data.dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [session, queryClient]);

  return socketRef.current;
}
