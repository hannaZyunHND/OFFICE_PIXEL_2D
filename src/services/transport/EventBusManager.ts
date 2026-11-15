import type { AgentEvent } from '@/types/events';
import type { TransportMode } from '@/services/storage/localConfig';
import { MockSimulatorEngine } from './MockSimulatorEngine';
import { WebSocketClient, type WebSocketControlCallbacks } from './WebSocketClient';
import { PostMessageBridge } from './PostMessageBridge';

export class EventBusManager {
  public readonly simulator: MockSimulatorEngine;
  public readonly wsClient: WebSocketClient;
  public readonly postMessageBridge: PostMessageBridge;

  constructor(
    onIngestEvent: (event: AgentEvent) => void,
    onSimulatorRunningChange: (running: boolean) => void,
    onWsStatusChange: (
      status: 'WS_CONNECTED' | 'WS_RECONNECTING' | 'WS_DISCONNECTED',
      attempt: number,
    ) => void,
    wsControlCallbacks?: WebSocketControlCallbacks,
  ) {
    this.simulator = new MockSimulatorEngine(
      onIngestEvent,
      onSimulatorRunningChange,
    );
    this.wsClient = new WebSocketClient(
      onIngestEvent,
      onWsStatusChange,
      wsControlCallbacks,
    );
    this.postMessageBridge = new PostMessageBridge(onIngestEvent);
  }

  public switchMode(mode: TransportMode, wsEndpoint?: string): void {
    this.simulator.stop();
    if (mode !== 'websocket') {
      this.wsClient.disconnect();
    }
    this.postMessageBridge.stopListening();

    if (mode === 'websocket' && wsEndpoint) {
      this.wsClient.connect(wsEndpoint);
    } else if (mode === 'postmessage') {
      this.postMessageBridge.startListening();
    }
  }

  public destroy(): void {
    this.simulator.stop();
    this.wsClient.disconnect();
    this.postMessageBridge.stopListening();
  }
}
