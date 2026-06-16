export type AgentState = 'assessing' | 'triaged' | 'active' | 'waiting' | 'stable' | 'error';
export type TriageSeverity = 'critical' | 'moderate' | 'stable';

export interface VitalsData {
  pulse?: number;
  breathing?: 'normal' | 'labored' | 'absent';
  conscious?: 'yes' | 'no' | 'unresponsive';
}

export interface StepAction {
  type: 'broadcast_coordinates' | 'log_entry' | 'call_number';
  label: string;
  logMessage?: string;
  phoneNumber?: string;
}

export interface AgentCardData {
  question: string;
  options: Array<{ label: string; value: string; variant?: 'primary' | 'tertiary' }>;
  icon?: string;
}

export interface TriageAssessmentData {
  severity: TriageSeverity;
  summary: string;
  protocolName: string;
}

export interface ProtocolStepData {
  stepNumber: number;
  totalSteps: number;
  protocolName: string;
  instruction: string;
  checklist?: string[];
  stepActions?: StepAction[];
  timedStep?: { durationSeconds: number; label: string };
}

export interface VitalsPanelData {
  fields: Array<'pulse' | 'breathing' | 'conscious'>;
}

export interface TimerData {
  label: string;
  durationSeconds: number;
  cycleLabel?: string;
}

export interface ParsedProtocol {
  protocolName: string;
  severity: TriageSeverity;
  triageSummary: string;
  vitalsNeeded: boolean;
  totalSteps: number;
  steps: Array<{
    instruction: string;
    checklist?: string[] | null;
    stepActions?: StepAction[] | null;
    timedStep?: { durationSeconds: number; label: string } | null;
  }>;
}
