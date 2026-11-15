import { describe, it, expect, vi } from 'vitest';
import { AgentEntity } from '@/engine/AgentEntity';
import { FSM_CONSTANTS, type AgentFsmState } from '@/types/fsm';
import type { AgentBlueprint, FurnitureItem } from '@/types/blueprint';

describe('AgentEntity FSM & Per-Agent Event Queue (1200ms Throttle + 8000ms Idle Timeout)', () => {
  const mockBlueprint: AgentBlueprint = {
    id: 'agent_researcher',
    name: 'Alice (Researcher)',
    role: 'Researcher',
    color: '#38bdf8',
    avatar_sprite: 'default_scientist',
    desk_id: 'furn_desk_1',
  };

  const mockDesk: FurnitureItem = {
    id: 'furn_desk_1',
    type: 'DESK_PC',
    x: 3,
    y: 4,
    footprint: [2, 1],
    interaction_point: [3, 5],
    facing: 'UP',
    agent_id: 'agent_researcher',
  };

  it('throttles rapid burst events so WORKING and TOOL_CALL each hold for at least 1200ms', async () => {
    const observedStates: AgentFsmState[] = [];

    const agent = new AgentEntity(mockBlueprint, 3, 5, 'UP', {
      onCoarseStateChange: (_id, state) => {
        observedStates.push(state);
      },
      onRequestPath: async (sx, sy, ex, ey) => [
        { x: sx, y: sy },
        { x: ex, y: ey },
      ],
      onRequestIdleSpot: () => ({
        x: 18,
        y: 10,
        facing: 'UP',
        furnitureId: 'furn_coffee_1',
      }),
      onLaunchHandoffPacket: vi.fn(),
      getAgentDesk: () => mockDesk,
    });

    // Enqueue 3 rapid events at once (burst in 0ms)
    agent.enqueueEvent({
      event_id: 'evt_1',
      timestamp: 1000,
      event_type: 'AGENT_START',
      agent_id: 'agent_researcher',
      metadata: { status_text: 'Starting research...' },
    });
    agent.enqueueEvent({
      event_id: 'evt_2',
      timestamp: 1001,
      event_type: 'AGENT_TOOL_CALL',
      agent_id: 'agent_researcher',
      metadata: { status_text: 'Searching ArXiv...', icon: 'search' },
    });
    agent.enqueueEvent({
      event_id: 'evt_3',
      timestamp: 1002,
      event_type: 'AGENT_COMPLETE',
      agent_id: 'agent_researcher',
      metadata: { status_text: 'Done!' },
    });

    // First tick pops AGENT_START -> WORKING
    agent.tick(16);
    await Promise.resolve();
    expect(agent.fsmState).toBe('WORKING');
    expect(agent.getQueueDepth()).toBe(2);

    // After 600ms (< 1200ms min_duration), agent MUST still be in WORKING
    agent.tick(600);
    expect(agent.fsmState).toBe('WORKING');
    expect(agent.getQueueDepth()).toBe(2);

    // After another 650ms (>= 1200ms total), hold expires and next tick pops AGENT_TOOL_CALL
    agent.tick(650);
    agent.tick(16);
    await Promise.resolve();
    expect(agent.fsmState).toBe('TOOL_CALL');
    expect(agent.getQueueDepth()).toBe(1);

    // Hold TOOL_CALL for 1200ms, then pop AGENT_COMPLETE
    agent.tick(1250);
    agent.tick(16);
    await Promise.resolve();
    expect(agent.fsmState).toBe('COMPLETE');
    expect(agent.getQueueDepth()).toBe(0);

    // After 8000ms inactivity in COMPLETE, agent routes to IDLE zone (MOVING -> IDLE)
    agent.tick(FSM_CONSTANTS.IDLE_SLACKING_TIMEOUT_MS + 100);
    await Promise.resolve();
    expect(agent.fsmState).toBe('MOVING');
  });
});
