import type { Message } from "@/components/chat";
import type { UserRecord } from "@/hooks/useDatabase";
import type { IncidentType } from "@/components/home/IncidentCard";
import type { ParsedProtocol } from "@/types/agent";
import type { ChatMessage } from "@/types/chatTypes";
import * as FileSystem from 'expo-file-system/legacy';

export function makeId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function resolveToolResultNote(toolName: string, result: any): string | null {
  if (result?.error) {
    console.warn(`[Tool:${toolName}]`, result.error);
    return null;
  }
  switch (toolName) {
    case 'get_user_location':
      return result?.address
        ? `📍 ${result.address}`
        : result?.latitude != null
          ? `📍 ${(result.latitude as number).toFixed(5)}, ${(result.longitude as number).toFixed(5)}`
          : null;
    case 'send_emergency_report':
      return result?.success ? `✓ Emergency report sent to ${result.sentTo}.` : null;
    // schedule_checkin and alert_user are background actions — show nothing in chat
    default:
      return null;
  }
}

export function parseActionDirectives(text: string): Array<{ tool: string; args: Record<string, unknown> }> {
  const out: Array<{ tool: string; args: Record<string, unknown> }> = [];
  for (const match of text.matchAll(/^ACTION:(\{.+\})$/gm)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed?.tool && parsed.tool !== 'none') {
        out.push({ tool: parsed.tool, args: parsed.args ?? {} });
      }
    } catch (_) {}
  }
  return out;
}

const TOOL_CALL_TEXT_RE = /\b(?:schedule_checkin|get_user_location|send_emergency_report|alert_user):\s*\n?\s*\{[^]*?\}\s*/g;

export function stripActionDirectives(text: string): string {
  return text
    .replace(/\nACTION:\{[^\n]+\}/g, '')
    .replace(/^ACTION:\{[^\n]+\}$/gm, '')
    .replace(TOOL_CALL_TEXT_RE, '')
    .trim();
}

export function buildSystemPrompt(
  incidentType: IncidentType | null,
  user: UserRecord | null,
  ragChunks: string[] = [],
  triageSeverity?: string,
): string {
  const lines: string[] = [
    "You are an emergency response AI assistant named Edgent.",
    "The user is in an emergency situation. Be calm, clear, and supportive.",
    "Give short, actionable guidance. Never panic or alarm the user further.",
    '',
    '## Image Analysis',
    'If the user sends an image, analyse it carefully and use what you see to give more accurate emergency guidance.',
    '',
  ];

  if (incidentType) {
    lines.push(`\nCURRENT EMERGENCY TYPE: ${incidentType.toUpperCase()}.`);
    lines.push("Tailor every piece of advice specifically to this emergency type.");
  }

  if (triageSeverity) {
    lines.push(`\n## Triage Severity\n${triageSeverity}`);
  }

  if (user) {
    lines.push("\nUSER PROFILE:");
    lines.push(`- Name: ${user.full_name}`);
    lines.push(`- Role: ${user.role}`);
    if (user.experience_level) {
      lines.push(`- Experience level: ${user.experience_level}`);
      if (user.experience_level === "rookie") {
        lines.push("  (Use simple language and step-by-step instructions.)");
      }
    }
    if (user.medical_history?.trim())   lines.push(`- Medical history: ${user.medical_history}`);
    if (user.health_conditions?.trim()) lines.push(`- Health conditions: ${user.health_conditions}`);
    if (user.disabilities?.trim())      lines.push(`- Disabilities: ${user.disabilities}`);
  }

  if (ragChunks.length > 0) {
    lines.push('\n## Reference Material (WHO Prehospital Emergency Care Protocols)');
    lines.push('Use these passages as your PRIMARY clinical reference.');
    ragChunks.forEach((chunk, i) => {
      lines.push(`### Protocol ${i + 1}`);
      lines.push(chunk.trim());
      lines.push('');
    });
  }

  lines.push('\n## TOOL DISPATCH — append an ACTION line at the end of EVERY reply, no exceptions');
  lines.push('Exact format (raw text, no markdown):');
  lines.push('ACTION:{"tool":"TOOL_NAME","args":{...}}');
  lines.push('No action needed? Still write: ACTION:{"tool":"none"}');
  lines.push('');
  lines.push('send_emergency_report — user is trapped / bleeding / needs external rescue:');
  lines.push('  ACTION:{"tool":"send_emergency_report","args":{"condition":"<observed condition>","recipient":"emergency_services"}}');
  lines.push('schedule_checkin — append after EVERY serious or critical response:');
  lines.push('  ACTION:{"tool":"schedule_checkin","args":{"delay_seconds":90,"message":"Still with me? Tap or type to confirm."}}');
  lines.push('alert_user — user stopped responding after a check-in:');
  lines.push('  ACTION:{"tool":"alert_user","args":{"intensity":"urgent"}}');
  lines.push('get_user_location — need GPS for dispatch or evacuation:');
  lines.push('  ACTION:{"tool":"get_user_location","args":{"name":"user"}}');
  lines.push('You may output multiple ACTION lines. You MUST output at least one.');

  return lines.join("\n");
}

export function seedToHistory(seeds: Message[]): ChatMessage[] {
  return seeds
    .filter(m => m.text && !m.type)
    .map(m => ({ id: m.id, role: m.sender === "user" ? "user" : "assistant", content: m.text! }));
}

export async function resolveLocalPath(uri: string): Promise<string> {
  if (uri.startsWith('content://')) {
    const dest = `${FileSystem.documentDirectory}attachment_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  }
  return uri.replace('file://', '');
}

const EMERGENCY_PATTERN = /\b(emergency|accident|injury|injured|hurt|pain|bleed|bleeding|blood|unconscious|unresponsive|breathing|seizure|stroke|heart|cardiac|cpr|choking|drowning|burn|fracture|broken|wound|fire|earthquake|flood|storm|lightning|tsunami|landslide|stuck|rubble|trapped|evacuate|evacuation|collapse|danger|rescue|ambulance|hospital|doctor|nurse|help|sos|critical|severe|dead|dying|faint|dizzy|allergic|overdose|poisoning|electric|shock|threat|attack|disaster|crisis)\b/i;

export function hasEmergencyIntent(text: string): boolean {
  return EMERGENCY_PATTERN.test(text);
}

export function parseStepsFromText(text: string): ParsedProtocol['steps'] {
  const lines = text.split('\n');
  const steps: string[] = [];
  let current = '';

  for (const line of lines) {
    if (/^\s*(?:step\s*)?(\d+)[.):\-]\s+\S/i.test(line)) {
      if (current.trim()) steps.push(current.trim());
      current = line.replace(/^\s*(?:step\s*)?\d+[.):\-]\s*/i, '').trim();
    } else if (current && line.trim()) {
      current += ' ' + line.trim();
    }
  }
  if (current.trim()) steps.push(current.trim());

  if (steps.length >= 2) {
    return steps.map(instruction => ({ instruction, checklist: null, stepActions: null, timedStep: null }));
  }

  // Fallback: bullet points or non-empty lines
  const bullets = text.split('\n')
    .map(l => l.replace(/^[-•*]\s*/, '').replace(/^\s*(?:step\s*)?\d+[.):\-]\s*/i, '').trim())
    .filter(l => l.length > 15);

  return bullets.slice(0, 6).map(instruction => ({ instruction, checklist: null, stepActions: null, timedStep: null }));
}
