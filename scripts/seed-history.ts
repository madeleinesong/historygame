/**
 * One-time setup: downloads Wikipedia articles and Wikisource primary documents
 * into data/history.db for offline use by the game.
 *
 * Run:  npx tsx scripts/seed-history.ts
 *
 * Re-running is safe — existing articles are skipped.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'history.db');

// ─── Article manifest ─────────────────────────────────────────────────────────

interface ArticleSpec {
  id: string;
  title: string;       // Wikipedia/Wikisource page title
  source: 'wikipedia' | 'wikisource';
  category: string;
}

const ARTICLES: ArticleSpec[] = [
  // Core 1933 events
  { id: 'nazi_seizure', title: 'Machtergreifung', source: 'wikipedia', category: 'event' },  // redirects on WP
  { id: 'reichstag_fire', title: 'Reichstag fire', source: 'wikipedia', category: 'event' },
  { id: 'enabling_act', title: 'Enabling Act of 1933', source: 'wikipedia', category: 'event' },
  { id: 'fire_decree', title: 'Reichstag Fire Decree', source: 'wikipedia', category: 'event' },
  { id: 'protection_decree', title: 'Decree for the Protection of the German People', source: 'wikipedia', category: 'event' },
  { id: 'march_election', title: 'March 1933 German federal election', source: 'wikipedia', category: 'event' },
  { id: 'weimar_end', title: 'Weimar Republic', source: 'wikipedia', category: 'event' },

  // Key people — Nazis
  { id: 'hitler', title: 'Adolf Hitler', source: 'wikipedia', category: 'person' },
  { id: 'goebbels', title: 'Joseph Goebbels', source: 'wikipedia', category: 'person' },
  { id: 'goering', title: 'Hermann Göring', source: 'wikipedia', category: 'person' },
  { id: 'roehm', title: 'Ernst Röhm', source: 'wikipedia', category: 'person' },
  { id: 'himmler', title: 'Heinrich Himmler', source: 'wikipedia', category: 'person' },

  // Key people — conservatives
  { id: 'papen', title: 'Franz von Papen', source: 'wikipedia', category: 'person' },
  { id: 'schleicher', title: 'Kurt von Schleicher', source: 'wikipedia', category: 'person' },
  { id: 'hindenburg', title: 'Paul von Hindenburg', source: 'wikipedia', category: 'person' },
  { id: 'blomberg', title: 'Werner von Blomberg', source: 'wikipedia', category: 'person' },
  { id: 'hugenberg', title: 'Alfred Hugenberg', source: 'wikipedia', category: 'person' },

  // Key people — opposition
  { id: 'wels', title: 'Otto Wels', source: 'wikipedia', category: 'person' },
  { id: 'thaelmann', title: 'Ernst Thälmann', source: 'wikipedia', category: 'person' },
  { id: 'kaas', title: 'Ludwig Kaas', source: 'wikipedia', category: 'person' },
  { id: 'brüning', title: 'Heinrich Brüning', source: 'wikipedia', category: 'person' },
  { id: 'van_der_lubbe', title: 'Marinus van der Lubbe', source: 'wikipedia', category: 'person' },

  // Key people — press & international
  { id: 'theodor_wolff', title: 'Theodor Wolff', source: 'wikipedia', category: 'person' },
  { id: 'dorothy_thompson', title: 'Dorothy Thompson', source: 'wikipedia', category: 'person' },
  { id: 'rumbold', title: 'Horace Rumbold', source: 'wikipedia', category: 'person' },
  { id: 'chamberlain_neville', title: 'Neville Chamberlain', source: 'wikipedia', category: 'person' },

  // Organizations
  { id: 'sa', title: 'Sturmabteilung', source: 'wikipedia', category: 'org' },
  { id: 'ss', title: 'Schutzstaffel', source: 'wikipedia', category: 'org' },
  { id: 'spd', title: 'Social Democratic Party of Germany', source: 'wikipedia', category: 'org' },
  { id: 'kpd', title: 'Communist Party of Germany', source: 'wikipedia', category: 'org' },
  { id: 'centre_party', title: 'Centre Party (Germany)', source: 'wikipedia', category: 'org' },
  { id: 'nsdap', title: 'Nazi Party', source: 'wikipedia', category: 'org' },
  { id: 'gestapo', title: 'Gestapo', source: 'wikipedia', category: 'org' },
  { id: 'reichswehr', title: 'Reichswehr', source: 'wikipedia', category: 'org' },

  // Places & institutions
  { id: 'berliner_tageblatt', title: 'Berliner Tageblatt', source: 'wikipedia', category: 'place' },
  { id: 'reichstag_building', title: 'Reichstag building', source: 'wikipedia', category: 'place' },
  { id: 'kroll_opera', title: 'Kroll Opera House', source: 'wikipedia', category: 'place' },
  { id: 'hotel_adlon', title: 'Hotel Adlon', source: 'wikipedia', category: 'place' },
  { id: 'potsdamer_platz', title: 'Potsdamer Platz', source: 'wikipedia', category: 'place' },

  // Legal/constitutional context
  { id: 'weimar_constitution', title: 'Weimar Constitution', source: 'wikipedia', category: 'legal' },
  { id: 'article_48', title: 'Article 48 of the Weimar Constitution', source: 'wikipedia', category: 'legal' },
  { id: 'schutzhaft', title: 'Protective custody in Nazi Germany', source: 'wikipedia', category: 'legal' },

  // Primary sources from Wikisource (English page titles)
  { id: 'ws_enabling_act', title: 'Enabling Act of 1933', source: 'wikisource', category: 'primary' },
  { id: 'ws_fire_decree', title: 'Reichstag Fire Decree', source: 'wikisource', category: 'primary' },
  { id: 'ws_wels_speech', title: 'Speech Against the Enabling Act (Wels)', source: 'wikisource', category: 'primary' },
  { id: 'ws_protection_decree', title: 'Decree for the Protection of the German People', source: 'wikisource', category: 'primary' },
];

// ─── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchWithRetry(url: string, label: string, retries = 4): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'inside-history-game/1.0 (educational; offline seed)' },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 429) {
      const wait = 5000 * (attempt + 1);
      process.stdout.write(`[429, retry in ${wait / 1000}s] `);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    return res;
  }
  throw new Error(`HTTP 429 (exhausted retries) for ${label}`);
}

async function fetchWikipediaText(title: string): Promise<string> {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'extracts',
    explaintext: 'true',
    exsectionformat: 'plain',
    format: 'json',
    formatversion: '2',
    redirects: '1',
  });
  const url = `https://en.wikipedia.org/w/api.php?${params}`;
  const res = await fetchWithRetry(url, title);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${title}`);
  const data = await res.json() as {
    query: { pages: Array<{ extract?: string; missing?: boolean; title?: string }> }
  };
  const page = data.query.pages[0];
  if (!page.missing && page.extract && page.extract.length > 100) return page.extract;

  // Fallback: REST summary API (follows redirects server-side)
  const restUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const restRes = await fetchWithRetry(restUrl, `${title} (REST fallback)`);
  if (!restRes.ok) throw new Error(`No content for "${title}"`);
  const restData = await restRes.json() as { extract?: string; type?: string };
  if (!restData.extract) throw new Error(`No extract for "${title}"`);
  return restData.extract;
}

async function fetchWikisourceText(title: string): Promise<string> {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'extracts',
    explaintext: 'true',
    format: 'json',
    formatversion: '2',
  });
  const url = `https://en.wikisource.org/w/api.php?${params}`;
  const res = await fetchWithRetry(url, `wikisource:${title}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for wikisource:${title}`);
  const data = await res.json() as {
    query: { pages: Array<{ extract?: string; missing?: boolean }> }
  };
  const page = data.query.pages[0];
  if (page.missing || !page.extract) throw new Error(`No content for wikisource:"${title}"`);
  return page.extract;
}

// ─── Chunking ──────────────────────────────────────────────────────────────────

function chunkText(text: string, targetWords = 400): string[] {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current: string[] = [];
  let wordCount = 0;

  for (const para of paragraphs) {
    const words = para.split(/\s+/).length;
    if (wordCount + words > targetWords && current.length > 0) {
      chunks.push(current.join('\n\n'));
      current = [];
      wordCount = 0;
    }
    current.push(para);
    wordCount += words;
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));
  return chunks;
}

// ─── DB setup ─────────────────────────────────────────────────────────────────

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id       TEXT PRIMARY KEY,
      title    TEXT NOT NULL,
      source   TEXT NOT NULL,
      category TEXT NOT NULL,
      url      TEXT,
      content  TEXT NOT NULL,
      fetched_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS passages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id  TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content     TEXT NOT NULL,
      FOREIGN KEY (article_id) REFERENCES articles(id)
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS passages_fts USING fts5(
      content,
      article_id UNINDEXED,
      chunk_index UNINDEXED,
      tokenize = 'porter unicode61'
    );
  `);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Database: ${DB_PATH}\n`);
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  initDb(db);

  const existingIds = new Set<string>(
    (db.prepare('SELECT id FROM articles').all() as { id: string }[]).map(r => r.id)
  );

  const insertArticle = db.prepare(
    `INSERT OR REPLACE INTO articles (id, title, source, category, url, content, fetched_at)
     VALUES (@id, @title, @source, @category, @url, @content, @fetched_at)`
  );
  const insertPassage = db.prepare(
    `INSERT INTO passages (article_id, chunk_index, content) VALUES (@article_id, @chunk_index, @content)`
  );
  const insertFts = db.prepare(
    `INSERT INTO passages_fts (content, article_id, chunk_index) VALUES (@content, @article_id, @chunk_index)`
  );
  const deletePassages = db.prepare(`DELETE FROM passages WHERE article_id = @id`);
  const deleteFts = db.prepare(`DELETE FROM passages_fts WHERE article_id = @id`);

  let ok = 0, skipped = 0, failed = 0;

  for (const spec of ARTICLES) {
    if (existingIds.has(spec.id)) {
      console.log(`  skip  ${spec.id}`);
      skipped++;
      continue;
    }

    process.stdout.write(`  fetch ${spec.source}:${spec.title} … `);
    try {
      const content = spec.source === 'wikisource'
        ? await fetchWikisourceText(spec.title)
        : await fetchWikipediaText(spec.title);

      const url = spec.source === 'wikisource'
        ? `https://en.wikisource.org/wiki/${encodeURIComponent(spec.title)}`
        : `https://en.wikipedia.org/wiki/${encodeURIComponent(spec.title)}`;

      const chunks = chunkText(content);

      const tx = db.transaction(() => {
        insertArticle.run({
          id: spec.id,
          title: spec.title,
          source: spec.source,
          category: spec.category,
          url,
          content,
          fetched_at: new Date().toISOString(),
        });
        deletePassages.run({ id: spec.id });
        deleteFts.run({ id: spec.id });
        chunks.forEach((chunk, i) => {
          insertPassage.run({ article_id: spec.id, chunk_index: i, content: chunk });
          insertFts.run({ content: chunk, article_id: spec.id, chunk_index: i });
        });
      });
      tx();

      console.log(`ok  (${chunks.length} chunks, ${Math.round(content.length / 1024)}KB)`);
      ok++;
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
      failed++;
    }

    // Pause between requests
    await new Promise(r => setTimeout(r, 2000));
  }

  // ── Hardcoded primary source documents (public domain) ──────────────────────
  // Wikisource's MediaWiki API doesn't reliably serve extracts; embed texts directly.
  const primaryDocs = [
    {
      id: 'ws_fire_decree',
      title: 'Reichstag Fire Decree (28 February 1933)',
      source: 'wikisource' as const,
      category: 'primary',
      url: 'https://en.wikisource.org/wiki/Reichstag_Fire_Decree',
      content: `DECREE OF THE REICH PRESIDENT FOR THE PROTECTION OF PEOPLE AND STATE
28 February 1933 (Reichstag Fire Decree / Reichstagsbrandverordnung)

On the basis of Article 48 paragraph 2 of the Constitution of the German Reich, the following is ordered in defense against Communist state-endangering acts of violence:

§ 1. Articles 114, 115, 117, 118, 123, 124 and 153 of the Constitution of the German Reich are suspended until further notice. It is therefore permissible to restrict the rights of personal freedom [habeas corpus], freedom of opinion, including the freedom of the press, the freedom to organize and assemble, the privacy of postal, telegraphic and telephonic communications, and warrants for house searches, orders for confiscations as well as restrictions on property, are also permissible beyond the legal limits otherwise prescribed.

§ 2. If in a state the measures necessary for the restoration of public security and order are not taken, the Reich Government may temporarily take over the powers of the highest state authority.

§ 3. The authorities of the states competent under §2 have to execute, in agreement with the Reich Government, the measures taken under §2.

§ 4. Whoever provokes, or appeals for or incites to the disobedience of the orders given out by the supreme state authorities or the authorities subordinate to them for the execution of this decree, or the orders given by the Reich Government according to §2, is punishable—insofar as the deed is not covered by other decrees with more severe punishments—with imprisonment of not less that one month, or with a fine from 150 up to 15,000 Reichsmark.

§ 5. The Reich Minister of the Interior, with the agreement of the State governments concerned, will issue the legal and administrative decrees needed to implement and supplement this decree.

§ 6. This decree comes into force on the day of its publication.
Berlin, 28 February 1933
The Reich President von Hindenburg
The Reich Chancellor Adolf Hitler
The Reich Minister of the Interior Frick
The Reich Minister of Justice Dr. Gürtner

Note: This decree suspended all civil liberties guaranteed by the Weimar Constitution and gave the Nazi government essentially unlimited power to arrest and detain political opponents. It remained in force until 1945. It was the legal basis for the arrest of approximately 10,000 Communists, Social Democrats, and other opponents in the days following the Reichstag fire.`,
    },
    {
      id: 'ws_enabling_act',
      title: 'Enabling Act of 1933 — Law to Remedy the Distress of People and Reich',
      source: 'wikisource' as const,
      category: 'primary',
      url: 'https://en.wikisource.org/wiki/Enabling_Act_of_1933',
      content: `ENABLING ACT OF 1933
(Gesetz zur Behebung der Not von Volk und Reich)
Passed by the Reichstag 23 March 1933, 444 votes to 94

The Reichstag has enacted the following law, which is hereby proclaimed with the assent of the Reichsrat, it having been established that the requirements for a constitutional amendment have been fulfilled:

Article 1. In addition to the procedure prescribed by the constitution, laws of the Reich may also be enacted by the government of the Reich. This includes the laws referred to by Articles 85 Paragraph 2 and Article 87 of the constitution.

Article 2. Laws enacted by the government of the Reich may deviate from the constitution as long as they do not affect the institutions of the Reichstag and the Reichsrat. The rights of the President remain undisturbed.

Article 3. Laws enacted by the Reich government shall be issued by the Chancellor and announced in the Reich Gazette. They shall take effect on the day following the announcement, unless they prescribe a different date. Articles 68 to 77 of the Constitution do not apply to laws enacted by the Reich Government.

Article 4. Treaties of the Reich with foreign states which affect matters of Reich legislation shall not require the approval of the bodies of the legislature. The government of the Reich shall enact the legislation necessary to implement these agreements.

Article 5. This law takes effect with the day of its proclamation. It loses force on April 1, 1937, or if the present Reich government is replaced by another.
Berlin, March 24, 1933

Note: The Enabling Act was the legal foundation of the Nazi dictatorship. It allowed Hitler's cabinet to legislate without the Reichstag for four years. It was renewed in 1937, 1939, and 1943. The vote was 444 in favour (NSDAP, DNVP, Centre Party, BVP, DVP, Landbund) and 94 against (SPD). The KPD deputies had already been arrested. SPD leader Otto Wels gave a courageous speech in opposition. Centre Party leader Ludwig Kaas led his party to vote yes after Hitler gave oral assurances — never committed to writing — of protections for Catholic institutions.`,
    },
    {
      id: 'ws_wels_speech',
      title: 'Otto Wels — Speech Against the Enabling Act (23 March 1933)',
      source: 'wikisource' as const,
      category: 'primary',
      url: 'https://en.wikisource.org/wiki/Speech_Against_the_Enabling_Act',
      content: `SPEECH BY OTTO WELS, SPD CHAIRMAN
Against the Enabling Act — Kroll Opera House, Berlin, 23 March 1933

[The following is a reconstruction based on historical records. The Reichstag met at the Kroll Opera House, surrounded by SA and SS men. Wels spoke knowing he faced possible arrest immediately afterward.]

"We German Social Democrats pledge ourselves solemnly in this historic hour to the principles of humanity and justice, of freedom and socialism. No enabling law gives you the power to destroy ideas which are eternal and indestructible.

The Anti-Socialist Laws of Bismarck were not able to destroy Social Democracy. Neither can your new persecutions. Social Democracy will never be destroyed.

You can take our freedom and our life, but you cannot take our honour.

We are defenseless but not honourless.

The measures of the government have set back the working class as a result of war, revolution and inflation. We have not lost our courage.

The election results of the 5th of March were obtained under the pressure of a state of emergency. The true will of the German people cannot be expressed in this atmosphere. We know that this present Reichstag does not reflect the political convictions of the German people.

We greet the persecuted and oppressed. We greet our friends in the Reich. Their steadfastness and loyalty deserve admiration. The courage of their convictions, their unbroken confidence, inspire us.

We salute you also, the workers and peasants and all those who stand for peace and equality of nations, freedom and justice.

We Social Democrats in this difficult hour make our solemn declaration. We are, so we swear it here solemnly, undefeated."

Note: Wels was the only party leader to speak against the Enabling Act. Hitler responded with fury, threatening that the SPD was unnecessary if it voted no. Wels' speech is considered one of the most important acts of principled resistance in German parliamentary history. He fled Germany shortly after. The SPD voted 94-0 against the Act — the only party to oppose it.`,
    },
    {
      id: 'ws_protection_decree',
      title: 'Decree for the Protection of the German People (4 February 1933)',
      source: 'wikisource' as const,
      category: 'primary',
      url: 'https://en.wikisource.org/wiki/Decree_for_the_Protection_of_the_German_People',
      content: `DECREE OF THE REICH PRESIDENT FOR THE PROTECTION OF THE GERMAN PEOPLE
4 February 1933

On the basis of Article 48, paragraph 2, of the Constitution, the following is decreed:

§ 1. (1) Meetings which are likely to endanger public security or order may be dissolved by the police.
(2) Open-air meetings and processions may be entirely prohibited in specific places or at specific times if there is an immediate danger of disturbance to public security.

§ 2. (1) Printed matter which is likely to endanger public security or order may be prohibited.
(2) In particular, it may be prohibited if its content constitutes an instigation to crime or to violations of the peace, or if its content insults the government of the Reich or of a German state, or government members, military or police forces, or is calculated to undermine the confidence of the people in their political leadership.

§ 3. Associations and combinations may be prohibited if their character or activities are directed against the constitutional government of the Reich or against the public order.

§ 4. This decree comes into force on the day of its publication.

Note: This decree — the first major restriction of civil liberties under Hitler — was issued on 4 February 1933, five days after Hitler became Chancellor, before the Reichstag fire. It was used to ban Communist and Social Democrat publications and meetings during the March 5 election campaign. It established the template for the much broader Reichstag Fire Decree of February 28. Unlike the Fire Decree, the Protection Decree required police to go through official channels; it was still constrained by normal legal procedures.`,
    },
  ];

  for (const doc of primaryDocs) {
    if (existingIds.has(doc.id)) {
      console.log(`  skip  ${doc.id} (hardcoded)`);
      continue;
    }
    const chunks = chunkText(doc.content);
    const tx = db.transaction(() => {
      insertArticle.run({ ...doc, fetched_at: new Date().toISOString() });
      deletePassages.run({ id: doc.id });
      deleteFts.run({ id: doc.id });
      chunks.forEach((chunk, i) => {
        insertPassage.run({ article_id: doc.id, chunk_index: i, content: chunk });
        insertFts.run({ content: chunk, article_id: doc.id, chunk_index: i });
      });
    });
    tx();
    console.log(`  embed ${doc.id} (hardcoded primary source, ${chunks.length} chunks)`);
    ok++;
  }

  const articleCount = (db.prepare('SELECT COUNT(*) as n FROM articles').get() as { n: number }).n;
  const passageCount = (db.prepare('SELECT COUNT(*) as n FROM passages').get() as { n: number }).n;

  console.log(`\nDone. ${ok} fetched/embedded, ${skipped} skipped, ${failed} failed`);
  console.log(`DB: ${articleCount} articles, ${passageCount} passages`);
  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
