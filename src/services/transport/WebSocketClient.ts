import type {
  AgentEvent,
  ExternalToolMetadata,
  HitlApprovalRequest,
  HitlApprovalResponse,
} from '@/types/events';
import type { OfficeBlueprint } from '@/types/blueprint';
import type { CrewAiFlowResult } from '@/stores/useUiStore';
import { DEFAULT_CREWAI_WS_ORIGIN } from '@/config/runtimeEndpoints';

export interface WebSocketControlCallbacks {
  onBlueprintSync?: (blueprint: OfficeBlueprint) => void;
  onFlowStarted?: (prompt: string, workflowId?: string) => void;
  onFlowResult?: (result: CrewAiFlowResult) => void;
  onFlowError?: (error: string) => void;
  onHumanApprovalRequired?: (approval: HitlApprovalRequest) => void;
  onToolRegistrySync?: (tools: ExternalToolMetadata[]) => void;
}

const DEFAULT_HUB_WS = DEFAULT_CREWAI_WS_ORIGIN;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private endpoint = '';
  private shouldReconnect = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMessages: string[] = [];
  private hasOpenedCurrentEndpoint = false;

  private readonly onEvent: (event: AgentEvent) => void;
  private readonly onStatusChange: (
    status: 'WS_CONNECTED' | 'WS_RECONNECTING' | 'WS_DISCONNECTED',
    attempt: number,
  ) => void;
  private readonly controlCallbacks?: WebSocketControlCallbacks;

  constructor(
    onEvent: (event: AgentEvent) => void,
    onStatusChange: (
      status: 'WS_CONNECTED' | 'WS_RECONNECTING' | 'WS_DISCONNECTED',
      attempt: number,
    ) => void,
    controlCallbacks?: WebSocketControlCallbacks,
  ) {
    this.onEvent = onEvent;
    this.onStatusChange = onStatusChange;
    this.controlCallbacks = controlCallbacks;
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public connect(endpoint: string): void {
    const cleanEndpoint = endpoint.trim() || DEFAULT_HUB_WS;
    if (
      this.ws &&
      this.endpoint === cleanEndpoint &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.disconnect();
    this.endpoint = cleanEndpoint;
    this.hasOpenedCurrentEndpoint = false;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.openSocket();
  }

  public dispatchTask(
    prompt: string,
    options: Record<string, unknown> = {},
  ): void {
    const payload = JSON.stringify({
      type: 'DISPATCH_TASK',
      prompt,
      options,
    });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.pendingMessages.push(payload);
      if (
        !this.ws ||
        this.ws.readyState === WebSocket.CLOSED ||
        this.ws.readyState === WebSocket.CLOSING
      ) {
        this.connect(this.endpoint || DEFAULT_HUB_WS);
      }
    }
  }

  public sendOfficeSnapshot(imageBase64: string, caption: string): void {
    if (!imageBase64 || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'OFFICE_SNAPSHOT',
        image_base64: imageBase64,
        caption,
      }),
    );
  }

  public sendHumanApprovalResponse(response: HitlApprovalResponse): void {
    const payload = JSON.stringify({
      type: 'HUMAN_APPROVAL_RESPONSE',
      response,
    });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      this.pendingMessages.push(payload);
      if (
        !this.ws ||
        this.ws.readyState === WebSocket.CLOSED ||
        this.ws.readyState === WebSocket.CLOSING
      ) {
        this.connect(this.endpoint || DEFAULT_HUB_WS);
      }
    }
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }
    this.onStatusChange('WS_DISCONNECTED', 0);
  }

  private openSocket(): void {
    try {
      this.ws = new WebSocket(this.endpoint);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.hasOpenedCurrentEndpoint = true;
      this.reconnectAttempts = 0;
      this.onStatusChange('WS_CONNECTED', 0);
      while (
        this.pendingMessages.length > 0 &&
        this.ws?.readyState === WebSocket.OPEN
      ) {
        const msg = this.pendingMessages.shift();
        if (msg) this.ws.send(msg);
      }
    };

    this.ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(String(msg.data)) as Record<string, unknown>;
        if (!parsed) return;

        // 1. Check for CrewAI Bridge Control Messages
        if (parsed.type === 'BLUEPRINT_SYNC' && parsed.blueprint) {
          this.controlCallbacks?.onBlueprintSync?.(
            parsed.blueprint as OfficeBlueprint,
          );
          return;
        }
        if (parsed.type === 'FLOW_STARTED') {
          this.controlCallbacks?.onFlowStarted?.(
            String(parsed.prompt || ''),
            String(parsed.workflow_id || ''),
          );
          return;
        }
        if (parsed.type === 'FLOW_RESULT' && parsed.result) {
          this.controlCallbacks?.onFlowResult?.(
            parsed.result as CrewAiFlowResult,
          );
          return;
        }
        if (parsed.type === 'FLOW_ERROR') {
          this.controlCallbacks?.onFlowError?.(
            String(parsed.error || 'Unknown error'),
          );
          return;
        }
        if (parsed.type === 'HUMAN_APPROVAL_REQUIRED' && parsed.approval) {
          this.controlCallbacks?.onHumanApprovalRequired?.(
            parsed.approval as HitlApprovalRequest,
          );
          return;
        }
        if (parsed.type === 'TOOL_REGISTRY_SYNC' && Array.isArray(parsed.tools)) {
          this.controlCallbacks?.onToolRegistrySync?.(
            parsed.tools as ExternalToolMetadata[],
          );
          return;
        }

        // 2. Standard Real-Time AgentEvent
        if (parsed.event_type && parsed.agent_id) {
          this.onEvent(parsed as unknown as AgentEvent);
        }
      } catch (err) {
        console.warn('[WebSocketClient] Invalid JSON packet:', err);
      }
    };

    this.ws.onerror = () => {
      // Handled by onclose
    };

    this.ws.onclose = () => {
      // If a custom port failed on initial connect, fall back to the central CrewAI Bridge Hub (DEFAULT_HUB_WS)
      if (
        !this.hasOpenedCurrentEndpoint &&
        !this.endpoint.startsWith(DEFAULT_HUB_WS)
      ) {
        this.endpoint = DEFAULT_HUB_WS;
        this.openSocket();
        return;
      }

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      } else {
        this.onStatusChange('WS_DISCONNECTED', 0);
      }
    };
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    this.reconnectAttempts++;
    this.onStatusChange('WS_RECONNECTING', this.reconnectAttempts);
    const delayMs = Math.min(
      30000,
      Math.pow(2, this.reconnectAttempts - 1) * 1000,
    );
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this.openSocket();
      }
    }, delayMs);
  }
}
