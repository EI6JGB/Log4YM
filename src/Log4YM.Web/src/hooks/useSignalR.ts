import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { signalRService } from '../api/signalr';
import { useAppStore } from '../store/appStore';

export function useSignalR() {
  const queryClient = useQueryClient();
  const {
    setConnected,
    setFocusedCallsign,
    setFocusedCallsignInfo,
    setRotatorPosition,
    setRigStatus,
  } = useAppStore();

  useEffect(() => {
    const connect = async () => {
      try {
        signalRService.setHandlers({
          onCallsignFocused: (evt) => {
            setFocusedCallsign(evt.callsign);
          },
          onCallsignLookedUp: (evt) => {
            setFocusedCallsignInfo(evt);
          },
          onQsoLogged: () => {
            // Invalidate QSO queries to refetch
            queryClient.invalidateQueries({ queryKey: ['qsos'] });
            queryClient.invalidateQueries({ queryKey: ['statistics'] });
          },
          onSpotReceived: () => {
            // Invalidate spots query
            queryClient.invalidateQueries({ queryKey: ['spots'] });
          },
          onRotatorPosition: (evt) => {
            setRotatorPosition(evt);
          },
          onRigStatus: (evt) => {
            setRigStatus(evt);
          },
        });

        await signalRService.connect();
        setConnected(true);
      } catch (error) {
        console.error('Failed to connect to SignalR:', error);
        setConnected(false);
      }
    };

    connect();

    return () => {
      signalRService.disconnect();
      setConnected(false);
    };
  }, [queryClient, setConnected, setFocusedCallsign, setFocusedCallsignInfo, setRotatorPosition, setRigStatus]);

  const focusCallsign = useCallback(async (callsign: string, source: string) => {
    setFocusedCallsign(callsign);
    await signalRService.focusCallsign({ callsign, source });
  }, [setFocusedCallsign]);

  const selectSpot = useCallback(async (dxCall: string, frequency: number, mode?: string) => {
    await signalRService.selectSpot({ dxCall, frequency, mode });
  }, []);

  const commandRotator = useCallback(async (targetAzimuth: number, source: string) => {
    await signalRService.commandRotator({ rotatorId: 'default', targetAzimuth, source });
  }, []);

  return {
    isConnected: signalRService.isConnected,
    focusCallsign,
    selectSpot,
    commandRotator,
  };
}
