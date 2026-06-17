import Anthropic from '@anthropic-ai/sdk';
import { WorldEvent } from './types';
import { searchPassages, isDbReady } from './localHistory';

// Articles most useful for timeline generation — covers full 1933-1945 arc
const TIMELINE_ARTICLE_QUERIES = [
  // 1933 crisis
  'Nazi seizure power 1933 January February March',
  'Reichstag fire February 1933 arson decree',
  'Enabling Act March 1933 vote Centre Party',
  'SA violence election campaign 1933',
  'Reichstag Fire Decree emergency powers arrests',
  // 1933-1934 consolidation
  'Night Long Knives 1934 Röhm purge Schleicher',
  'Hindenburg death 1934 Hitler president oath Wehrmacht',
  // 1935-1938 expansion
  'Nuremberg Laws 1935 Jewish persecution citizenship',
  'Rhineland remilitarisation 1936 Versailles violation',
  'Anschluss 1938 Austria annexation',
  'Munich Agreement 1938 Sudetenland Chamberlain appeasement',
  'Kristallnacht 1938 pogrom Jewish businesses',
  // 1939-1941
  'invasion Poland 1939 world war begins',
  'fall France 1940 armistice Vichy',
  'Operation Barbarossa 1941 Soviet Union invasion',
  // 1942-1945
  'Wannsee Conference 1942 Final Solution Holocaust',
  'Battle Stalingrad 1942 1943 turning point',
  'July 20 plot 1944 Stauffenberg assassination attempt',
  'German resistance Nazism opposition conspirators',
  'V-E Day 1945 German surrender end war',
];

const TIMELINE_PROMPT = `You are a historian specialising in the Nazi regime and World War II. Using the primary and secondary sources below, generate a JSON array of all significant, datable events from January 30, 1933 through May 8, 1945 (inclusive).

SOURCES:
{SOURCES}

Rules:
- Include 60–80 events. Prefer events with a specific, verifiable date.
- Cover the full arc across four phases:
  PHASE 1 (Jan–Mar 1933): press decrees, SA violence, KPD persecution, election campaign, Reichstag fire, emergency decrees, Centre Party negotiations, Enabling Act vote.
  PHASE 2 (Mar 1933–Aug 1934): Dachau opens, party bans, Night of Long Knives, Hindenburg's death, Wehrmacht oath.
  PHASE 3 (Aug 1934–Sep 1939): Nuremberg Laws, remilitarisation of Rhineland, Anschluss, Munich Agreement, Kristallnacht, German rearmament.
  PHASE 4 (Sep 1939–May 1945): invasion of Poland, fall of France, Barbarossa, Wannsee Conference, Stalingrad, July 20 plot, D-Day, fall of Berlin, V-E Day.
- Use "historical_unless_prevented" for events a well-placed, determined person could plausibly have disrupted with advance knowledge. Use "historical" for events that will happen regardless.
- naziConsolidationEffect: integer −15 to +25. Large positive = Nazi power dramatically increases. Negative = power weakens (Stalingrad, D-Day, etc.).

Output ONLY a valid JSON array with no markdown fences. Each object must have exactly these fields:
{
  "id": "snake_case_unique",
  "description": "1-2 sentence factual description with specific names and dates",
  "scheduledDate": "YYYY-MM-DDTHH:mm:ss",
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
