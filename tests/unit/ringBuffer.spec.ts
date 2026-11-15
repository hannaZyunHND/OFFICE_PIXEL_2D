import { describe, it, expect } from 'vitest';
import {
  RingBuffer,
  TELEMETRY_MAX_EVENTS,
  PAYLOAD_MAX_BYTES,
  toStoredTelemetryEvent,
} from '@/services/storage/ringBuffer';
import type { AgentEvent } from '@/types/events';

describe('RingBuffer & 10KB Payload Truncation (Constitution Principle V)', () => {
  it('caps stored telemetry events at 200 items and evicts oldest items in FIFO order', () => {
    const buffer = new RingBuffer<number>(TELEMETRY_MAX_EVENTS);

    for (let i = 1; i <= 255; i++) {
      buffer.push(i);
    }

    expect(buffer.size()).toBe(200);
    const items = buffer.toArray();
    expect(items[0]).toBe(56);
    expect(items[199]).toBe(255);

    const newestFirst = buffer.toNewestFirstArray();
    expect(newestFirst[0]).toBe(255);
    expect(newestFirst[199]).toBe(56);
  });

  it('truncates input_payload and output_payload exceeding 10KB while preserving full JSON for export', () => {
    const hugeString = 'A'.repeat(15 * 1024); // 15KB
    const event: AgentEvent = {
      event_id: 'evt_big_01',
      timestamp: 1731600000,
      event_type: 'AGENT_TOOL_CALL',
      agent_id: 'agent_researcher',
      metadata: {
        status_text: 'Processing large corpus...',
        icon: 'search',
        input_payload: { query: 'test', raw_text: hugeString },
        output_payload: { summary: 'short summary' },
        tokens_used: 1200,
      },
    };

    const stored = toStoredTelemetryEvent(event, PAYLOAD_MAX_BYTES);
    expect(stored.input_truncated).toBe(true);
    expect(stored.input_byte_length).toBeGreaterThan(PAYLOAD_MAX_BYTES);
    expect(stored.input_preview).toContain('[TRUNCATED AT 10KB');
    expect(stored.full_input_json).toBeDefined();
    expect(stored.full_input_json!.length).toBeGreaterThan(15000);

    expect(stored.output_truncated).toBe(false);
    expect(stored.output_preview).toContain('short summary');
    expect(stored.full_output_json).toBeUndefined();
  });
});
