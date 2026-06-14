import Anthropic from '@anthropic-ai/sdk';
import { WorldEvent } from './types';

const WIKI_ARTICLES = [
  'Nazi_seizure_of_power',
  'Reichstag_fire',
  'Enabling_Act_of_1933',
  'Reichstag_Fire_Decree',
  'March_1933_German_federal_election',
  'Franz_von_Papen',
  'Centre_Party_(Germany)',
];

async function fetchWikiSummary(title: string): Promise<string> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'inside-history-game/1.0 (educational)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Wikipedia ${title}: ${res.status}`);
  const data = await res.json() as { title: string; extract: string };
  return `### ${data.title}\n${data.extract}`;
}

const TIMELINE_PROMPT = `You are a historian specialising in Weimar Germany and the Nazi seizure of power. Using the Wikipedia sources below, generate a JSON array of all significant, datable events between January 30 and March 23, 1933 (inclusive).

SOURCES:
{SOURCES}

Rules:
- Include 30–40 events. Prefer events with a specific, verifiable date.
- Cover the full arc: press decrees, SA violence, KPD persecution, election campaign, Reichstag fire, emergency decrees, diplomatic reactions, Centre Party negotiations, and the Enabling Act vote.
- Use "historical_unless_prevented" for events an alert, well-connected person acting from inside Germany could plausibly have disrupted (e.g. the Reichstag fire arson, the arrest of a specific individual, the broadcast of a specific speech). Use "historical" for events that will happen regardless.
- naziConsolidationEffect: integer −10 to +15. Large positive = Nazi power dramatically increases. Small negative = something weakens their grip.

Output ONLY a valid JSON array with no markdown fences. Each object must have exactly these fields:
{
  "id": "snake_case_unique",
  "description": "1-2 sentence factual description with specific names and dates",
  "scheduledDate": "1933-MM-DDTHH:mm:ss",
  "triggerCondition": "historical" | "historical_unless_prevented",
  "triggered": false,
  "preventable": true | false,
  "naziConsolidationEffect": <integer>,
  "keyActors": ["array of names"],
  "historicalNote": "one sentence citing what makes this verifiable (e.g. decree number, newspaper, speech title)"
}`;

export async function generateHistoricalTimeline(
  client: Anthropic,
  model: string,
): Promise<WorldEvent[]> {
  // Fetch Wikipedia articles in parallel; tolerate individual failures
  const results = await Promise.allSettled(WIKI_ARTICLES.map(fetchWikiSummary));
  const sources = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map(r => r.value)
    .join('\n\n');

  if (!sources) throw new Error('All Wikipedia fetches failed');

  const message = await client.messages.create({
    model,
    max_tokens: 6000,
    messages: [{
      role: 'user',
      content: TIMELINE_PROMPT.replace('{SOURCES}', sources),
    }],
  });

  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) throw new Error('No JSON array in timeline response');

  const events: WorldEvent[] = JSON.parse(arrayMatch[0]);

  // Sort chronologically and deduplicate by id
  const seen = new Set<string>();
  return events
    .filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}
