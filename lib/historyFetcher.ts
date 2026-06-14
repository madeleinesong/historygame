import Anthropic from '@anthropic-ai/sdk';
import { WorldEvent } from './types';
import { searchPassages, isDbReady } from './localHistory';

// Articles most useful for timeline generation
const TIMELINE_ARTICLE_QUERIES = [
  'Nazi seizure power 1933 January February March',
  'Reichstag fire February 1933 arson decree',
  'Enabling Act March 1933 vote Centre Party',
  'SA violence election campaign 1933',
  'Reichstag Fire Decree emergency powers arrests',
];

const TIMELINE_PROMPT = `You are a historian specialising in Weimar Germany and the Nazi seizure of power. Using the primary and secondary sources below, generate a JSON array of all significant, datable events between January 30 and March 23, 1933 (inclusive).

SOURCES:
{SOURCES}

Rules:
- Include 30–40 events. Prefer events with a specific, verifiable date.
- Cover the full arc: press decrees, SA violence, KPD persecution, election campaign, Reichstag fire, emergency decrees, diplomatic reactions, Centre Party negotiations, and the Enabling Act vote.
- Use "historical_unless_prevented" for events an alert, well-connected person acting from inside Germany could plausibly have disrupted (e.g. the Reichstag fire arson, the arrest of a specific individual, the broadcast of a specific speech). Use "historical" for events that will happen regardless.
- naziConsolidationEffect: integer −10 to +15. Large positive = Nazi power dramatically increases.

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

async function buildSourcesFromLocalDb(): Promise<string> {
  const allPassages: string[] = [];
  const seen = new Set<string>();

  for (const query of TIMELINE_ARTICLE_QUERIES) {
    const results = searchPassages(query, 4);
    for (const p of results) {
      const key = `${p.article_id}:${p.chunk_index}`;
      if (!seen.has(key)) {
        seen.add(key);
        allPassages.push(`[${p.title ?? p.article_id}]\n${p.content}`);
      }
    }
  }

  return allPassages.join('\n\n---\n\n');
}

export async function generateHistoricalTimeline(
  client: Anthropic,
  model: string,
): Promise<WorldEvent[]> {
  let sources: string;

  if (isDbReady()) {
    // Offline path: query local SQLite DB
    sources = await buildSourcesFromLocalDb();
    console.log('[historyFetcher] Using local DB for timeline generation');
  } else {
    // Online fallback: live Wikipedia REST API summaries
    console.log('[historyFetcher] Local DB not found, falling back to Wikipedia REST API');
    sources = await buildSourcesFromWikipedia();
  }

  if (!sources.trim()) throw new Error('No source material available for timeline generation');

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

  // Sort chronologically, deduplicate
  const seen = new Set<string>();
  return events
    .filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

// ─── Live Wikipedia fallback ──────────────────────────────────────────────────

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

async function buildSourcesFromWikipedia(): Promise<string> {
  const results = await Promise.allSettled(WIKI_ARTICLES.map(fetchWikiSummary));
  return results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map(r => r.value)
    .join('\n\n');
}
