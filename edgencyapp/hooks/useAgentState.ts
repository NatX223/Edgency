import { useState } from 'react';
import type { AgentState, TriageSeverity, VitalsData } from '@/types/agent';
import type { IncidentType } from '@/components/home/IncidentCard';

interface AgentStateHook {
  agentState: AgentState;
  protocolName: string | undefined;
  severity: TriageSeverity | undefined;
  currentStep: number;
  totalSteps: number;
  collectedVitals: VitalsData | undefined;
  assessmentAnswers: Record<string, string>;

  setAssessing: () => void;
  setTriaged: (severity: TriageSeverity) => void;
  startProtocol: (name: string, total: number) => void;
  advanceStep: () => void;
  setStable: () => void;
  setError: () => void;
  setVitals: (vitals: VitalsData) => void;
  recordAnswer: (question: string, answer: string) => void;
  reset: () => void;
}

export function useAgentState(): AgentStateHook {
  const [agentState, setAgentState] = useState<AgentState>('assessing');
  const [protocolName, setProtocolName] = useState<string | undefined>();
  const [severity, setSeverity] = useState<TriageSeverity | undefined>();
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [collectedVitals, setCollectedVitals] = useState<VitalsData | undefined>();
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string>>({});

  const reset = () => {
    setAgentState('assessing');
    setProtocolName(undefined);
    setSeverity(undefined);
    setCurrentStep(0);
    setTotalSteps(0);
    setCollectedVitals(undefined);
    setAssessmentAnswers({});
  };

  return {
    agentState,
    protocolName,
    severity,
    currentStep,
    totalSteps,
    collectedVitals,
    assessmentAnswers,

    setAssessing: () => setAgentState('assessing'),
    setTriaged: (s) => { setSeverity(s); setAgentState('triaged'); },
    startProtocol: (name, total) => {
      setProtocolName(name);
      setTotalSteps(total);
      setCurrentStep(1);
      setAgentState('active');
    },
    advanceStep: () => {
      setCurrentStep(prev => prev + 1);
      setAgentState('active');
    },
    setStable: () => setAgentState('stable'),
    setError:  () => setAgentState('error'),
    setVitals: (v) => setCollectedVitals(v),
    recordAnswer: (q, a) => setAssessmentAnswers(prev => ({ ...prev, [q]: a })),
    reset,
  };
}
