import type { AgentEvent } from '@/types/events';
import { MOCK_SCENARIOS, type MockScenarioDefinition } from '@/data/mockScenarios';
import type { AgentBlueprint, WorkflowEdge } from '@/types/blueprint';
import type { WorkflowSimulationStep } from '@/services/compiler/workflowGenerator';

export class MockSimulatorEngine {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private isRunning = false;
  private stepCursor = 0;
  private activeScenario: MockScenarioDefinition = MOCK_SCENARIOS[0];
  private customWorkflowSteps: WorkflowSimulationStep[] | null = null;
  private onEmitEvent: (event: AgentEvent) => void;
  private onStateChange: (running: boolean) => void;

  constructor(
    onEmitEvent: (event: AgentEvent) => void,
    onStateChange: (running: boolean) => void,
  ) {
    this.onEmitEvent = onEmitEvent;
    this.onStateChange = onStateChange;
  }

  public setScenario(scenarioId: string): void {
    const found = MOCK_SCENARIOS.find((s) => s.id === scenarioId);
    if (found) {
      this.activeScenario = found;
      this.customWorkflowSteps = null;
      this.stepCursor = 0;
    }
  }

  public setCustomWorkflowSteps(steps: WorkflowSimulationStep[]): void {
    this.customWorkflowSteps = steps;
    this.stepCursor = 0;
  }

  public start(
    speedMultiplier: 1 | 2 = 1,
    dynamicAgents?: AgentBlueprint[],
    dynamicEdges?: WorkflowEdge[],
  ): void {
    this.stop();
    this.isRunning = true;
    this.stepCursor = 0;
    this.onStateChange(true);

    const steps =
      this.customWorkflowSteps && this.customWorkflowSteps.length > 0
        ? this.customWorkflowSteps
        : this.buildAdaptedSteps(dynamicAgents, dynamicEdges);
    let cumulativeDelay = 0;

    steps.forEach((step, idx) => {
      cumulativeDelay += Math.max(40, Math.round(step.delayMs / speedMultiplier));
      const timer = setTimeout(() => {
        if (!this.isRunning) return;
        this.stepCursor = idx + 1;
        this.emitHydratedEvent(step.event);

        if (idx === steps.length - 1) {
          this.isRunning = false;
          this.onStateChange(false);
        }
      }, cumulativeDelay);
      this.timers.push(timer);
    });
  }

  public stepNext(
    dynamicAgents?: AgentBlueprint[],
    dynamicEdges?: WorkflowEdge[],
  ): void {
    const steps =
      this.customWorkflowSteps && this.customWorkflowSteps.length > 0
        ? this.customWorkflowSteps
        : this.buildAdaptedSteps(dynamicAgents, dynamicEdges);
    if (steps.length === 0) return;
    const step = steps[this.stepCursor % steps.length];
    this.stepCursor = (this.stepCursor + 1) % steps.length;
    this.emitHydratedEvent(step.event);
  }

  public triggerBurstStress(targetAgentId = 'agent_researcher'): void {
    const burstScenario =
      MOCK_SCENARIOS.find((s) => s.id === 'burst_queue_stress') || MOCK_SCENARIOS[0];
    let delay = 0;
    for (const step of burstScenario.steps) {
      delay += 75;
      const t = setTimeout(() => {
        this.emitHydratedEvent({
          ...step.event,
          agent_id: targetAgentId,
        });
      }, delay);
      this.timers.push(t);
    }
  }

  public stop(): void {
    for (const t of this.timers) {
      clearTimeout(t);
    }
    this.timers = [];
    if (this.isRunning) {
      this.isRunning = false;
      this.onStateChange(false);
    }
  }

  private buildAdaptedSteps(
    dynamicAgents?: AgentBlueprint[],
    dynamicEdges?: WorkflowEdge[],
  ): MockScenarioDefinition['steps'] {
    if (!dynamicAgents || dynamicAgents.length === 0) {
      return this.activeScenario.steps;
    }

    const agentIdSet = new Set(dynamicAgents.map((a) => a.id));
    const activeScenarioMatches = this.activeScenario.steps.every((s) =>
      agentIdSet.has(s.event.agent_id),
    );
    if (activeScenarioMatches) {
      return this.activeScenario.steps;
    }

    const synthesized: MockScenarioDefinition['steps'] = [];
    const edges = dynamicEdges && dynamicEdges.length > 0 ? dynamicEdges : [];

    for (let i = 0; i < dynamicAgents.length; i++) {
      const agent = dynamicAgents[i];
      synthesized.push({
        delayMs: i === 0 ? 250 : 500,
        event: {
          event_type: 'AGENT_START',
          agent_id: agent.id,
          metadata: {
            status_text: `${agent.name}: Đang xử lý tác vụ (${agent.role})...`,
            tokens_used: 340 + i * 60,
          },
        },
      });

      synthesized.push({
        delayMs: 1300,
        event: {
          event_type: 'AGENT_TOOL_CALL',
          agent_id: agent.id,
          metadata: {
            status_text: `${agent.name}: Đang thực thi công cụ chuyên biệt...`,
            icon: i % 2 === 0 ? 'code' : 'search',
            tokens_used: 520,
          },
        },
      });

      const outgoingEdges = edges.filter((e) => e.from === agent.id);
      for (const edge of outgoingEdges) {
        synthesized.push({
          delayMs: 900,
          event: {
            event_type: 'AGENT_HANDOFF',
            agent_id: agent.id,
            target_agent_id: edge.to,
            metadata: {
              status_text: `Chuyển giao [${edge.label}] -> ${edge.to}...`,
              icon: 'message',
              tokens_used: 180,
            },
          },
        });
      }

      synthesized.push({
        delayMs: 600,
        event: {
          event_type: 'AGENT_COMPLETE',
          agent_id: agent.id,
          metadata: {
            status_text: `${agent.name} hoàn tất công việc ✓`,
            icon: 'check',
            tokens_used: 110,
          },
        },
      });
    }

    return synthesized;
  }

  private emitHydratedEvent(
    raw: Omit<AgentEvent, 'event_id' | 'timestamp'>,
  ): void {
    const fullEvent: AgentEvent = {
      ...raw,
      event_id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    this.onEmitEvent(fullEvent);
  }
}
