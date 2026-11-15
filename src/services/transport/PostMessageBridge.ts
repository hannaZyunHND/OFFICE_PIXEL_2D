import type { AgentEvent } from '@/types/events';

const CHANNEL_NAME = 'pixel_agent_office_events';

/**
 * Listens for standardized AgentEvent packets over:
 * 1. window.postMessage (for parent window / iframe integration)
 * 2. BroadcastChannel('pixel_agent_office_events') (for cross-tab developer testing)
 */
export class PostMessageBridge {
  private channel: BroadcastChannel | null = null;
  private boundWindowListener: ((e: MessageEvent) => void) | null = null;
  private readonly onEvent: (event: AgentEvent) => void;

  constructor(onEvent: (event: AgentEvent) => void) {
    this.onEvent = onEvent;
  }

  public startListening(): void {
    this.stopListening();

    this.boundWindowListener = (e: MessageEvent) => {
      this.tryProcessPayload(e.data);
    };
    window.addEventListener('message', this.boundWindowListener);

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (e: MessageEvent) => {
        this.tryProcessPayload(e.data);
      };
    }
  }

  public stopListening(): void {
    if (this.boundWindowListener) {
      window.removeEventListener('message', this.boundWindowListener);
      this.boundWindowListener = null;
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }

  private tryProcessPayload(raw: unknown): void {
    if (!raw) return;
    try {
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (
        obj &&
        typeof obj === 'object' &&
        'event_type' in obj &&
        'agent_id' in obj
      ) {
        this.onEvent(obj as AgentEvent);
      }
    } catch {
      // Ignore unrelated window messages
    }
  }
}
