const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

type Callback = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<Callback>> = new Map();
  public auth: { tempToken: string | null } = { tempToken: null };
  public connected: boolean = false;
  private reconnectTimeout: any = null;
  private explicitlyClosed: boolean = false;

  constructor() {}

  get disconnected(): boolean {
    return !this.connected;
  }

  on(event: string, callback: Callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback?: Callback) {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    if (this.ws && this.connected) {
      if (event === 'join-track' || event === 'leave-track') {
        this.ws.send(JSON.stringify({ type: event, uid: args[0] }));
      } else {
        this.ws.send(JSON.stringify({ type: event, data: args[0] }));
      }
    }
  }

  connect() {
    if (this.ws) {
      return;
    }
    this.explicitlyClosed = false;

    // Convert http/https to ws/wss, supporting relative URLs
    let wsUrl: URL;
    const trimmedApiUrl = API_URL.trim();
    if (trimmedApiUrl.startsWith('http://') || trimmedApiUrl.startsWith('https://')) {
      wsUrl = new URL(trimmedApiUrl.replace(/^http/, 'ws'));
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = new URL(`${protocol}//${window.location.host}${trimmedApiUrl}`);
    }

    wsUrl.pathname = '/realtime';
    if (this.auth.tempToken) {
      wsUrl.searchParams.set('tempToken', this.auth.tempToken);
    }

    try {
      this.ws = new WebSocket(wsUrl.toString());

      this.ws.onopen = () => {
        this.connected = true;
        this.trigger('connect', null);
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && typeof payload.type === 'string') {
            this.trigger(payload.type, payload);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onclose = () => {
        const wasConnected = this.connected;
        this.connected = false;
        this.ws = null;
        if (wasConnected) {
          this.trigger('disconnect', null);
        }

        // Auto-reconnect if not explicitly closed
        if (!this.explicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.explicitlyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 3000);
  }

  private trigger(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event callback for ${event}:`, err);
        }
      });
    }
  }
}

const socket = new WebSocketClient();
export default socket;
