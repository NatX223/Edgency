import type { AgentCardData } from "@/types/agent";

export const ASSESSMENT_QUESTIONS: Record<string, AgentCardData[]> = {
  medical: [
    {
      question: 'Is the person conscious?',
      icon: '🩺',
      options: [
        { label: 'Yes',        value: 'conscious_yes',    variant: 'primary'  },
        { label: 'No',         value: 'conscious_no',     variant: 'primary'  },
        { label: "Not sure",   value: 'conscious_unsure', variant: 'tertiary' },
      ],
    },
    {
      question: 'Are they breathing?',
      icon: '🫁',
      options: [
        { label: 'Yes',               value: 'breathing_yes',     variant: 'primary'  },
        { label: 'No',                value: 'breathing_no',      variant: 'primary'  },
        { label: 'Labored / gasping', value: 'breathing_labored', variant: 'tertiary' },
      ],
    },
  ],
  earth: [
    {
      question: 'Are you or anyone nearby trapped?',
      icon: '🏚️',
      options: [
        { label: 'Yes, trapped',   value: 'trapped_yes',    variant: 'primary'  },
        { label: 'No, can move',   value: 'trapped_no',     variant: 'primary'  },
        { label: 'Unsure',         value: 'trapped_unsure', variant: 'tertiary' },
      ],
    },
    {
      question: 'Are there injuries?',
      icon: '🩹',
      options: [
        { label: 'Serious',  value: 'injuries_serious', variant: 'primary'  },
        { label: 'Minor',    value: 'injuries_minor',   variant: 'primary'  },
        { label: 'None',     value: 'injuries_none',    variant: 'tertiary' },
      ],
    },
  ],
  flood: [
    {
      question: 'Is the water level rising?',
      icon: '🌊',
      options: [
        { label: 'Rapidly',           value: 'water_rapid',  variant: 'primary'  },
        { label: 'Slowly',            value: 'water_slow',   variant: 'primary'  },
        { label: 'Stable / receding', value: 'water_stable', variant: 'tertiary' },
      ],
    },
    {
      question: 'Are you in an elevated location?',
      icon: '🏔️',
      options: [
        { label: 'Yes, elevated',     value: 'location_safe',   variant: 'primary' },
        { label: 'No, ground level',  value: 'location_danger', variant: 'primary' },
      ],
    },
  ],
  storm: [
    {
      question: 'Are you in a secure shelter?',
      icon: '🌩️',
      options: [
        { label: 'Yes, sheltered', value: 'shelter_yes', variant: 'primary' },
        { label: 'No, exposed',    value: 'shelter_no',  variant: 'primary' },
      ],
    },
    {
      question: 'Is there immediate danger around you?',
      icon: '⚡',
      options: [
        { label: 'Yes, critical',    value: 'danger_critical',  variant: 'primary'  },
        { label: 'Some risks',       value: 'danger_moderate',  variant: 'primary'  },
        { label: 'Relatively safe',  value: 'danger_safe',      variant: 'tertiary' },
      ],
    },
  ],
};

// Narrower pattern: user is personally in immediate physical danger right now
export const CRITICAL_SELF_DANGER_PATTERN = /\b(stuck|trapped|can'?t move|cannot move|buried|pinned|rubble|debris|bleed|bleeding|blood|can'?t breathe|cannot breathe|drowning|unconscious|dying|help me|save me|sos|can'?t get out|cannot get out)\b/i;

// Maps incident type to its dedicated RAG workspace so searches never
// pull chunks from unrelated domains (e.g. lightning into medical chat).
export const INCIDENT_WORKSPACE: Record<string, string> = {
  medical: 'medical',
  earth:   'general',
  flood:   'water',
  storm:   'storm',
};
