import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radii } from '@/constants/tokens';

export interface AISegment {
  type: 'text' | 'step';
  content: string;
  stepNum?: number;
  title?: string;
  body?: string;
}

export function parseAIText(text: string): AISegment[] {
  const lines = text.split('\n');
  const segments: AISegment[] = [];
  const textBuffer: string[] = [];

  const flush = () => {
    const txt = textBuffer.join('\n').trim();
    if (txt) segments.push({ type: 'text', content: txt });
    textBuffer.length = 0;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const stepMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (stepMatch) {
      flush();
      const stepNum = parseInt(stepMatch[1], 10);
      const rest = stepMatch[2];
      // "**Title**: body" or "**Title** body"
      const boldMatch = rest.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/);
      // "Title: body" (title is short, no colon in it)
      const colonMatch = !boldMatch && rest.match(/^([A-Za-z][^:]{1,40}):\s+(.+)$/);
      if (boldMatch) {
        segments.push({ type: 'step', content: rest, stepNum, title: boldMatch[1].trim(), body: boldMatch[2].trim() || rest });
      } else if (colonMatch) {
        segments.push({ type: 'step', content: rest, stepNum, title: colonMatch[1].trim(), body: colonMatch[2].trim() });
      } else {
        segments.push({ type: 'step', content: rest, stepNum });
      }
    } else {
      textBuffer.push(line);
    }
  }

  flush();
  return segments;
}

export function segmentsHaveSteps(segments: AISegment[]): boolean {
  return segments.some(s => s.type === 'step');
}

function StepCard({ segment }: { segment: AISegment }) {
  return (
    <View style={st.stepCard}>
      <View style={st.badge}>
        <Text style={st.badgeNum}>{segment.stepNum}</Text>
      </View>
      <View style={st.stepBody}>
        {segment.title ? (
          <>
            <Text style={st.stepTitle}>{segment.title}</Text>
            <Text style={st.stepText}>{segment.body ?? segment.content}</Text>
          </>
        ) : (
          <Text style={st.stepText}>{segment.content}</Text>
        )}
      </View>
    </View>
  );
}

export function RichAIContent({ segments }: { segments: AISegment[] }) {
  return (
    <View style={st.container}>
      {segments.map((seg, i) =>
        seg.type === 'step' ? (
          <StepCard key={i} segment={seg} />
        ) : (
          seg.content ? <Text key={i} style={st.prose}>{seg.content}</Text> : null
        )
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  prose: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.sm,
    padding: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'flex-start',
    borderLeftWidth: 2,
    borderLeftColor: Colors.primaryContainer,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  badgeNum: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: Colors.onPrimaryContainer,
  },
  stepBody: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  stepText: {
    ...Typography.bodyMd,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 19,
  },
});
