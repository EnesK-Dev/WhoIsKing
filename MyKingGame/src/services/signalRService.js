import * as signalR from '@microsoft/signalr';
import { getNgrokBypassHeaders, getSignalRHubUrl } from '../config/env';

class SignalRService {
  constructor() {
    this.connection = null;
    this.startPromise = null;
    this.lifecycleHandlers = {};
  }

  setLifecycleHandlers(handlers = {}) {
    this.lifecycleHandlers = handlers;
  }

  getConnectionState() {
    if (!this.connection) {
      return 'Disconnected';
    }
    switch (this.connection.state) {
      case signalR.HubConnectionState.Connected:
        return 'Connected';
      case signalR.HubConnectionState.Connecting:
      case signalR.HubConnectionState.Reconnecting:
        return 'Reconnecting';
      default:
        return 'Disconnected';
    }
  }

  buildConnection() {
    if (this.connection) {
      return this.connection;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(getSignalRHubUrl(), {
        headers: { ...getNgrokBypassHeaders() },
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.connection.onreconnecting((error) => {
      console.log('[SignalR] Reconnecting...', error?.message ?? '');
      this.lifecycleHandlers.onReconnecting?.(error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log('[SignalR] Reconnected. ConnectionId:', connectionId);
      this.lifecycleHandlers.onReconnected?.(connectionId);
    });

    this.connection.onclose((error) => {
      console.log('[SignalR] Disconnected.', error?.message ?? '');
      this.lifecycleHandlers.onDisconnected?.(error);
    });

    return this.connection;
  }

  async startConnection() {
    const connection = this.buildConnection();

    if (connection.state === signalR.HubConnectionState.Connected) {
      return connection;
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = connection
      .start()
      .then(() => {
        console.log('[SignalR] Connected.', getSignalRHubUrl());
        this.lifecycleHandlers.onConnected?.();
        return connection;
      })
      .catch((error) => {
        console.log('[SignalR] Connection start failed:', error?.message ?? error);
        this.lifecycleHandlers.onError?.(error);
        throw error;
      })
      .finally(() => {
        this.startPromise = null;
      });

    return this.startPromise;
  }

  async stopConnection() {
    if (!this.connection) {
      return;
    }
    await this.connection.stop();
    this.connection = null;
  }

  on(eventName, handler) {
    const connection = this.buildConnection();
    connection.off(eventName);
    connection.on(eventName, handler);
  }

  async invoke(methodName, ...args) {
    const connection = this.buildConnection();
    if (connection.state !== signalR.HubConnectionState.Connected) {
      await this.startConnection();
    }
    return connection.invoke(methodName, ...args);
  }
}

const signalRService = new SignalRService();

export default signalRService;
