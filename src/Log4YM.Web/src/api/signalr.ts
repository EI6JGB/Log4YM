import * as signalR from '@microsoft/signalr';

export interface CallsignFocusedEvent {
  callsign: string;
  source: string;
  grid?: string;
  frequency?: number;
  mode?: string;
}

export interface CallsignLookedUpEvent {
  callsign: string;
  name?: string;
  grid?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  dxcc?: number;
  cqZone?: number;
  ituZone?: number;
  state?: string;
  imageUrl?: string;
  bearing?: number;
  distance?: number;
}

export interface QsoLoggedEvent {
  id: string;
  callsign: string;
  qsoDate: string;
  timeOn: string;
  band: string;
  mode: string;
  frequency?: number;
  rstSent?: string;
  rstRcvd?: string;
  grid?: string;
}

export interface SpotReceivedEvent {
  id: string;
  dxCall: string;
  spotter: string;
  frequency: number;
  mode?: string;
  comment?: string;
  timestamp: string;
  source: string;
  country?: string;
  dxcc?: number;
}

export interface SpotSelectedEvent {
  dxCall: string;
  frequency: number;
  mode?: string;
  grid?: string;
}

export interface RotatorPositionEvent {
  rotatorId: string;
  currentAzimuth: number;
  isMoving: boolean;
  targetAzimuth?: number;
}

export interface RotatorCommandEvent {
  rotatorId: string;
  targetAzimuth: number;
  source: string;
}

export interface RigStatusEvent {
  rigId: string;
  frequency: number;
  mode: string;
  isTransmitting: boolean;
}

type EventHandlers = {
  onCallsignFocused?: (evt: CallsignFocusedEvent) => void;
  onCallsignLookedUp?: (evt: CallsignLookedUpEvent) => void;
  onQsoLogged?: (evt: QsoLoggedEvent) => void;
  onSpotReceived?: (evt: SpotReceivedEvent) => void;
  onSpotSelected?: (evt: SpotSelectedEvent) => void;
  onRotatorPosition?: (evt: RotatorPositionEvent) => void;
  onRigStatus?: (evt: RigStatusEvent) => void;
};

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private handlers: EventHandlers = {};
  private maxReconnectAttempts = 10;

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/log')
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount >= this.maxReconnectAttempts) {
            return null;
          }
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupEventHandlers();

    this.connection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
    });

    this.connection.onreconnected(() => {
      console.log('SignalR reconnected');
    });

    this.connection.onclose(() => {
      console.log('SignalR connection closed');
    });

    try {
      await this.connection.start();
      console.log('SignalR connected');
    } catch (err) {
      console.error('SignalR connection error:', err);
      throw err;
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    this.connection.on('OnCallsignFocused', (evt: CallsignFocusedEvent) => {
      this.handlers.onCallsignFocused?.(evt);
    });

    this.connection.on('OnCallsignLookedUp', (evt: CallsignLookedUpEvent) => {
      this.handlers.onCallsignLookedUp?.(evt);
    });

    this.connection.on('OnQsoLogged', (evt: QsoLoggedEvent) => {
      this.handlers.onQsoLogged?.(evt);
    });

    this.connection.on('OnSpotReceived', (evt: SpotReceivedEvent) => {
      this.handlers.onSpotReceived?.(evt);
    });

    this.connection.on('OnSpotSelected', (evt: SpotSelectedEvent) => {
      this.handlers.onSpotSelected?.(evt);
    });

    this.connection.on('OnRotatorPosition', (evt: RotatorPositionEvent) => {
      this.handlers.onRotatorPosition?.(evt);
    });

    this.connection.on('OnRigStatus', (evt: RigStatusEvent) => {
      this.handlers.onRigStatus?.(evt);
    });
  }

  setHandlers(handlers: EventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  // Client-to-server methods
  async focusCallsign(evt: CallsignFocusedEvent): Promise<void> {
    await this.connection?.invoke('FocusCallsign', evt);
  }

  async selectSpot(evt: SpotSelectedEvent): Promise<void> {
    await this.connection?.invoke('SelectSpot', evt);
  }

  async commandRotator(evt: RotatorCommandEvent): Promise<void> {
    await this.connection?.invoke('CommandRotator', evt);
  }

  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop();
  }
}

export const signalRService = new SignalRService();
