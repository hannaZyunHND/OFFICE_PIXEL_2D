import type { AgentEvent, StoredTelemetryEvent } from '@/types/events';

export const TELEMETRY_MAX_EVENTS = 200;
export const PAYLOAD_MAX_BYTES = 10 * 1024; // 10KB

/**
 * Serializes any payload into pretty JSON and truncates at PAYLOAD_MAX_BYTES (10KB).
 */
export function formatAndTruncatePayload(
  payload: unknown,
  maxBytes: number = PAYLOAD_MAX_BYTES,
): {
  preview: string;
  truncated: boolean;
  byteLength: number;
  fullJson: string;
} {
  if (payload === undefined || payload === null) {
    return {
      preview: '',
      truncated: false,
      byteLength: 0,
      fullJson: '',
    };
  }

  const fullJson =
    typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);

  const encoder = new TextEncoder();
  const encoded = encoder.encode(fullJson);
  const byteLength = encoded.byteLength;

  if (byteLength <= maxBytes) {
    return {
      preview: fullJson,
      truncated: false,
      byteLength,
      fullJson,
    };
  }

  const decoder = new TextDecoder('utf-8', { fatal: false });
  const slicedText = decoder.decode(encoded.slice(0, maxBytes));
  return {
    preview: `${slicedText}\n\n... [TRUNCATED AT 10KB — Total ${(byteLength / 1024).toFixed(1)} KB]`,
    truncated: true,
    byteLength,
    fullJson,
  };
}

/**
 * Convert an incoming AgentEvent into a memory-bounded StoredTelemetryEvent.
 */
export function toStoredTelemetryEvent(
  event: AgentEvent,
  maxBytes: number = PAYLOAD_MAX_BYTES,
): StoredTelemetryEvent {
  const inputInfo = formatAndTruncatePayload(event.metadata?.input_payload, maxBytes);
  const outputInfo = formatAndTruncatePayload(event.metadata?.output_payload, maxBytes);

  return {
    ...event,
    received_at_ms: Date.now(),
    input_truncated: inputInfo.truncated,
    output_truncated: outputInfo.truncated,
    input_preview: inputInfo.preview,
    output_preview: outputInfo.preview,
    input_byte_length: inputInfo.byteLength,
    output_byte_length: outputInfo.byteLength,
    full_input_json: inputInfo.truncated ? inputInfo.fullJson : undefined,
    full_output_json: outputInfo.truncated ? outputInfo.fullJson : undefined,
  };
}

/**
 * Fixed-capacity Circular / Ring Buffer (Default: 200 items max).
 * Automatically evicts the oldest item when capacity is reached.
 */
export class RingBuffer<T> {
  private readonly capacity: number;
  private buffer: (T | undefined)[];
  private head = 0;
  private count = 0;

  constructor(capacity: number = TELEMETRY_MAX_EVENTS) {
    if (capacity <= 0) {
      throw new Error('RingBuffer capacity must be greater than 0');
    }
    this.capacity = capacity;
    this.buffer = new Array<T | undefined>(capacity);
  }

  public push(item: T): void {
    const writeIndex = (this.head + this.count) % this.capacity;
    if (this.count < this.capacity) {
      this.buffer[writeIndex] = item;
      this.count++;
    } else {
      // Overwrite oldest item at head and advance head
      this.buffer[this.head] = item;
      this.head = (this.head + 1) % this.capacity;
    }
  }

  /**
   * Returns items ordered from oldest to newest.
   */
  public toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[(this.head + i) % this.capacity];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Returns items ordered from newest to oldest (for Inspector Event Timeline).
   */
  public toNewestFirstArray(): T[] {
    return this.toArray().reverse();
  }

  public size(): number {
    return this.count;
  }

  public maxCapacity(): number {
    return this.capacity;
  }

  public clear(): void {
    this.buffer = new Array<T | undefined>(this.capacity);
    this.head = 0;
    this.count = 0;
  }
}
