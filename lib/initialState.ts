import { GameState, CharacterType, WorldState } from './types';

const BASE_WORLD: WorldState = {
  naziConsolidationLevel: 8,
  keyActorStates: {
    hitler: {
      name: 'Adolf Hitler',
      disposition: 'triumphant, moving to consolidate power rapidly',
      location: 'Reich Chancellery, Wilhelmstrasse',
      status: 'active',
      notes: 'Just appointed Chancellor. Planning to call new elections and neutralize opposition.',
    },
    hindenburg: {
      name: 'Paul von Hindenburg',
      disposition: 'reluctant, believes he has contained Hitler via cabinet constraints',
      location: 'Reichspräsident\'s Palace',
      status: 'active',
      notes: 'Old, frail, manipulated by Papen. Believes non-Nazi ministers will check Hitler.',
    },
    papen: {
      name: 'Franz von Papen',
      disposition: 'overconfident, believes he is the real power behind Hitler',
      location: 'Vice-Chancellery',
      status: 'active',
      notes: '"We have hired him." Fatally underestimates Nazi ruthlessness. Also Centre Party Catholic — potential lever.',
    },
    schleicher: {
      name: 'Kurt von Schleicher',
      disposition: 'bitter, plotting counter-moves',
      location: 'Berlin, private residence',
      status: 'active',
      notes: 'Former Chancellor. Potential ally against Hitler if approached carefully.',
    },
    goebbels: {
      name: 'Joseph Goebbels',
      disposition: 'ecstatic, organizing propaganda apparatus',
      location: 'NSDAP headquarters, Berlin',
      status: 'active',
      notes: 'Will control all media if Nazis consolidate. Key target to expose or isolate.',
    },
    spd_leadership: {
      name: 'SPD Leadership (Otto Wels et al.)',
      disposition: 'alarmed but committed to constitutional methods',
      location: 'SPD headquarters, Berlin',
      status: 'active',
      notes: 'Will eventually be the only party to vote against the Enabling Act.',
    },
    kpd_leadership: {
      name: 'KPD Leadership (Ernst Thälmann)',
      disposition: 'hostile to SPD, underestimating Nazi threat',
      location: 'KPD headquarters, Berlin',
      status: 'active',
      notes: 'Fatally calls SPD "social fascists." May be more receptive to united front arguments.',
    },
    reichswehr_command: {
      name: 'General Werner von Blomberg (Reichswehr)',
      disposition: 'accommodating to Hitler',
      location: 'Reichswehr HQ, Bendlerblock',
      status: 'active',
      notes: 'New Defense Minister, loyal to Hitler. Other generals may be more skeptical.',
    },
    centre_party: {
      name: 'Ludwig Kaas (Centre Party chairman)',
      disposition: 'deeply anxious, seeking guarantees from Hitler',
      location: 'Centre Party offices, Berlin',
      status: 'active',
      notes: 'Will ultimately lead Centre Party to vote for Enabling Act after extracting hollow promises. Key figure to persuade otherwise.',
    },
  },
  pendingEvents: [
    {
      id: 'reichstag_dissolved',
      description: 'Hitler dissolves Reichstag and calls new elections for March 5, 1933',
      triggerCondition: 'historical',
      scheduledDate: '1933-02-01',
      triggered: false,
    },
    {
      id: 'reichstag_fire',
      description: 'The Reichstag building burns under mysterious circumstances',
      triggerCondition: 'historical_unless_prevented',
      scheduledDate: '1933-02-27',
      triggered: false,
    },
    {
      id: 'enabling_act_vote',
      description: 'Reichstag votes on the Enabling Act',
      triggerCondition: 'historical_unless_prevented',
      scheduledDate: '1933-03-23',
      triggered: false,
    },
  ],
  triggeredEvents: [],
  causalChain: [
    'Jan 30: Hitler appointed Reich Chancellor by Hindenburg',
  ],
  reichstagFireStatus: 'not_happened',
  enablingActStatus: 'not_introduced',
  extraDetails: {
    electionsCalled: false,
    pressRestrictions: false,
    saStreetViolence: 'low',
    internationalAwareness: 'low',
    centrepartyPosition: 'undecided',
    britishGovernmentAwareness: 'dismissive',
  },
};

function createJournalistState(): GameState {
  return {
    version: 1,
    gameStatus: 'playing',
    currentDateTime: 'Monday, January 30, 1933, 9:00 AM',
    currentDateISO: '1933-01-30T09:00:00',
    turnCount: 0,
    currentLocation: 'Café Josty, Potsdamer Platz, Berlin',
    player: {
      name: 'Karl Brandt',
      occupation: 'Journalist',
      affiliation: 'Berliner Tageblatt',
      physicalStatus: 'healthy',
      money: 12,
      inventory: [
        'press identification card',
        'reporter\'s notebook',
        'fountain pen',
        'street map of Berlin',
        'Berliner Tageblatt press badge',
      ],
      relationships: [
        {
          person: 'Theodor Wolff (editor-in-chief, Berliner Tageblatt)',
          status: 'acquaintance',
          lastContact: '1933-01-28',
          notes: 'Skeptical of Nazi rise but fears reprisals. Wants compelling evidence before printing anything inflammatory.',
        },
        {
          person: 'Hans Schreiber (SPD Reichstag deputy)',
          status: 'acquaintance',
          lastContact: '1933-01-15',
          notes: 'Met at a parliamentary press event. Cautiously sympathetic to liberal press.',
        },
        {
          person: 'Greta Fuchs (café regular, secretary at Interior Ministry)',
          status: 'acquaintance',
          lastContact: '1933-01-29',
          notes: 'Shares a table at Café Josty most mornings. Nervous about the political climate.',
        },
      ],
      knownFacts: [
        'Hitler was appointed Reich Chancellor by Hindenburg this morning, January 30, 1933.',
        'Papen is Vice-Chancellor and believes he can control Hitler.',
        'The Reichstag is scheduled to meet but may be dissolved for new elections.',
        'The KPD (Communist Party) is legal but under increasing pressure.',
        'The SA (Brownshirts) held a torchlight parade through Berlin last night.',
        'Schleicher was forced out as Chancellor after Papen undermined him with Hindenburg.',
        'The Enabling Act, if passed, would give Hitler dictatorial power for four years.',
        'The Reichstag Fire Decree could suspend civil liberties if an emergency is declared.',
      ],
      characterType: 'journalist',
    },
    world: BASE_WORLD,
    journal: [],
  };
}

function createCentrePartyState(): GameState {
  return {
    version: 1,
    gameStatus: 'playing',
    currentDateTime: 'Monday, January 30, 1933, 10:30 AM',
    currentDateISO: '1933-01-30T10:30:00',
    turnCount: 0,
    currentLocation: 'Centre Party offices, Linkstrasse, Berlin',
    player: {
      name: 'Heinrich Möller',
      occupation: 'Reichstag Deputy',
      affiliation: 'Zentrumspartei (Centre Party)',
      physicalStatus: 'healthy',
      money: 45,
      inventory: [
        'Reichstag member pass',
        'Centre Party membership card',
        'leather briefcase',
        'telephone directory (Berlin)',
        'draft letter to Cardinal Bertram',
      ],
      relationships: [
        {
          person: 'Ludwig Kaas (Centre Party chairman)',
          status: 'acquaintance',
          lastContact: '1933-01-28',
          notes: 'Party chairman. Deeply anxious, meeting with Hitler to extract guarantees. Believes he can negotiate. Dangerously naive.',
        },
        {
          person: 'Monsignor Georg Schreiber (Centre Party deputy, Münster)',
          status: 'trusted',
          lastContact: '1933-01-30',
          notes: 'Close colleague. Shares your doubts about accommodating the Nazis. Catholic conscience guides him.',
        },
        {
          person: 'Franz von Papen (Vice-Chancellor)',
          status: 'acquaintance',
          lastContact: '1933-01-20',
          notes: 'Fellow Catholic but has abandoned the Centre Party. Arrogantly certain he controls Hitler. Might be leverage or a bridge.',
        },
        {
          person: 'Otto Wels (SPD chairman)',
          status: 'stranger',
          lastContact: null,
          notes: 'SPD leader. Would need careful approach — Centre Party and SPD have clashed badly. But they share opposition to the Enabling Act.',
        },
      ],
      knownFacts: [
        'Hitler was appointed Chancellor this morning. Hindenburg signed the appointment.',
        'The Enabling Act will require a 2/3 majority in the Reichstag. Without Centre Party votes, it cannot pass.',
        'Centre Party has 74 seats. NSDAP + DNVP together cannot reach 2/3 without us.',
        'Chairman Kaas is already seeking a private meeting with Hitler to extract constitutional guarantees.',
        'The Vatican is watching carefully — a Concordat with the new government is being discussed.',
        'Papen gave Hitler our votes in exchange for a promise to protect Catholic institutions.',
        'The SPD will vote no. The KPD deputies will likely be arrested before the vote.',
        'If our party votes yes, the Enabling Act passes. If we vote no, it fails.',
        'Nazi SA men have already begun intimidating deputies in the streets.',
        'The vote is expected around late March — we have weeks to organize resistance or capitulation.',
      ],
      characterType: 'centre_party_deputy',
    },
    world: {
      ...BASE_WORLD,
      extraDetails: {
        ...BASE_WORLD.extraDetails,
        centrepartyPosition: 'negotiating',
        concordatNegotiations: 'rumored',
        saIntimidation: 'beginning',
      },
    },
    journal: [],
  };
}

function createChamberlainState(): GameState {
  return {
    version: 1,
    gameStatus: 'playing',
    currentDateTime: 'Monday, January 30, 1933, 10:00 AM',
    currentDateISO: '1933-01-30T10:00:00',
    turnCount: 0,
    currentLocation: '11 Downing Street, London',
    player: {
      name: 'Neville Chamberlain',
      occupation: 'Chancellor of the Exchequer',
      affiliation: 'His Majesty\'s Government (Conservative)',
      physicalStatus: 'healthy',
      money: 0,
      inventory: [
        'Cabinet briefing papers',
        'Foreign Office telegram: Hitler appointed Chancellor',
        'Treasury red box',
        'personal appointment diary',
        'telephone (direct line to Foreign Office)',
      ],
      relationships: [
        {
          person: 'Sir John Simon (Foreign Secretary)',
          status: 'acquaintance',
          lastContact: '1933-01-27',
          notes: 'Foreign Secretary. Cautious, legalistic, deeply reluctant to make waves. Must be convinced that Germany is an urgent threat.',
        },
        {
          person: 'Ramsay MacDonald (Prime Minister)',
          status: 'acquaintance',
          lastContact: '1933-01-25',
          notes: 'National Government PM, increasingly frail and distracted. Dislikes confrontation with any foreign power.',
        },
        {
          person: 'Ambassador Horace Rumbold (Berlin)',
          status: 'acquaintance',
          lastContact: '1933-01-20',
          notes: 'British Ambassador in Berlin. Astute observer — his dispatches have been increasingly alarming. A key source of intelligence.',
        },
        {
          person: 'Édouard Daladier (French War Minister)',
          status: 'stranger',
          lastContact: null,
          notes: 'French government contact. France is more alarmed by Hitler than Britain. Could be an ally in raising international pressure.',
        },
        {
          person: 'The Times (Geoffrey Dawson, editor)',
          status: 'acquaintance',
          lastContact: '1933-01-10',
          notes: 'Editor of The Times. Influential but instinctively pro-appeasement. Can be briefed but will need strong evidence to change editorial line.',
        },
      ],
      knownFacts: [
        'Hitler appointed German Chancellor this morning. Foreign Office telegram arrived at 9AM.',
        'Hitler has been Chancellor of the Exchequer\'s main concern since NSDAP\'s September 1930 electoral surge.',
        'Britain\'s official position is non-interference in German domestic politics.',
        'France views Germany with far greater alarm — they share a border.',
        'The League of Nations is theoretically the mechanism for international pressure, but it is weak.',
        'German rearmament, if Hitler pursues it, would violate the Treaty of Versailles.',
        'British banks have significant loans to German industry — economic leverage exists.',
        'Ambassador Rumbold has been sending increasingly alarmed dispatches from Berlin.',
        'The Enabling Act vote is expected in late March — international pressure before then could matter.',
        'The British press is largely dismissive of Hitler, treating him as a temporary phenomenon.',
      ],
      characterType: 'chamberlain',
    },
    world: {
      ...BASE_WORLD,
      extraDetails: {
        ...BASE_WORLD.extraDetails,
        britishGovernmentAwareness: 'dismissive',
        frenchGovernmentAwareness: 'alarmed',
        leagueOfNationsInvolvement: 'none',
        internationalPressure: 'none',
        britishBankExposure: 'high',
      },
    },
    journal: [],
  };
}

export function createInitialState(characterType: CharacterType = 'journalist'): GameState {
  switch (characterType) {
    case 'centre_party_deputy':
      return createCentrePartyState();
    case 'chamberlain':
      return createChamberlainState();
    default:
      return createJournalistState();
  }
}
