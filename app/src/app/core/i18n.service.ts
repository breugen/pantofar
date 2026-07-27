import { Injectable, signal } from '@angular/core';
import { LocalizedText } from './model/db';

export type Lang = 'ro' | 'en';

const STORAGE_KEY = 'pm-lang';

/** UI strings. Data-borne prose (route notes) is Romanian until validated; en appears where the DB has it. */
const UI: Record<string, LocalizedText> = {
  'home.tagline': { ro: 'Trasee marcate pentru începători', en: 'Marked trails for beginners' },
  'home.yourRegion': { ro: 'Regiunea ta', en: 'Your region' },
  'home.regionSign': { ro: 'Rarău · Câmpulung Mold.', en: 'Rarău · Câmpulung Mold.' },
  'home.chooseType': { ro: 'Alege felul ieșirii', en: 'Pick your kind of outing' },
  'home.foot': { ro: 'Poteci marcate, combinate pentru tine.', en: 'Marked paths, combined for you.' },
  'list.anywhere': { ro: 'Oriunde', en: 'Anywhere' },
  'list.circuitOnly': { ro: 'Doar circuit', en: 'Circuits only' },
  'list.start': { ro: 'Pornire:', en: 'Start:' },
  'list.duration': { ro: 'Durată', en: 'Duration' },
  'list.of': { ro: 'din', en: 'of' },
  'list.results': { ro: 'trasee', en: 'tracks' },
  'list.more': { ro: 'Mai multe', en: 'More' },
  'list.twoDays': { ro: '2 zile', en: '2 days' },
  'list.none': { ro: 'Niciun traseu nu se potrivește filtrelor alese.', en: 'No track matches the chosen filters.' },
  'tags.tren': { ro: 'tren', en: 'train' },
  'tags.parcare': { ro: 'parcare', en: 'car park' },
  'tags.apa': { ro: 'apă', en: 'water' },
  'tags.cabana': { ro: 'cabană', en: 'hut' },
  'tags.padure': { ro: 'pădure seculară', en: 'old-growth forest' },
  'tags.suggestion': { ro: 'sugestie nevalidată', en: 'unvalidated suggestion' },
  'tags.notRecommended': { ro: 'nerecomandat', en: 'not recommended' },
  'status.inValidation': { ro: 'în validare', en: 'under validation' },
  'detail.day': { ro: 'Ziua', en: 'Day' },
  'detail.durata': { ro: 'Durata', en: 'Duration' },
  'detail.intoarcere': { ro: 'Întoarcere', en: 'Return' },
  'detail.urcare': { ro: 'Urcare', en: 'Ascent' },
  'detail.lungime': { ro: 'Lungime', en: 'Length' },
  'detail.difficulty': { ro: 'Dificultate', en: 'Difficulty' },
  'detail.milestonesNote': {
    ro: 'timpi calculați (DIN 33466 calibrat), fără factorul de confort — orientativi, în validare',
    en: 'computed times (calibrated DIN 33466), before the comfort factor — indicative, under validation'
  },
  'detail.comfortNote': {
    ro: 'timpi calculați cu un factor de confort ×1,3 peste DIN 33466 — mers așezat, cu pauze scurte; sugestie neverificată pe teren',
    en: 'times computed with a ×1.3 comfort factor over DIN 33466 — an unhurried pace with short breaks; suggestion not yet field-checked'
  },
  'detail.estimatedNote': { ro: 'conține porțiuni prin oraș estimate aproximativ', en: 'includes roughly-estimated town walking' },
  'detail.descriere': { ro: 'Descriere', en: 'Description' },
  'detail.winter': { ro: 'Iarna', en: 'In winter' },
  'detail.water': { ro: 'Apă', en: 'Water' },
  'detail.access': { ro: 'Cum ajungi', en: 'Getting there' },
  'detail.lodging': { ro: 'Cazare', en: 'Lodging' },
  'detail.safety': { ro: 'Siguranță', en: 'Safety' },
  'detail.concerns': { ro: 'Atenție, pantofari', en: 'Mind you, pantofari' },
  'detail.validation': { ro: 'Note de validare', en: 'Validation notes' },
  'detail.sources': { ro: 'Surse', en: 'Sources' },
  'detail.flora': { ro: 'Floră și faună', en: 'Flora & fauna' },
  'detail.backToList': { ro: 'Înapoi la trasee', en: 'Back to the tracks' },
  'detail.notFound': { ro: 'Traseul nu există în registru.', en: 'No such track in the ledger.' },
  'footer.disclaimer': {
    ro: 'Ghid în lucru — nu înlocuiește harta, prognoza și judecata proprie. Datele sunt în curs de validare.',
    en: 'A guide in progress — no substitute for a map, the forecast and your own judgement. Data is being validated.'
  },
  'footer.attribution': {
    ro: 'Date: © OpenStreetMap (ODbL) · fapte de traseu extrase de pe muntii-nostri.ro · timpi calculați DIN 33466',
    en: 'Data: © OpenStreetMap (ODbL) · trail facts extracted from muntii-nostri.ro · times computed via DIN 33466'
  },
  'common.back': { ro: 'Înapoi', en: 'Back' }
};

const DIFFICULTY_EN: Record<string, string> = {
  'ușor': 'easy', 'mediu': 'moderate', 'dificil': 'hard'
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>(readStoredLang());

  setLang(lang: Lang): void {
    this.lang.set(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private mode */ }
  }

  /** Localized text from data: picks the current language, falls back to Romanian. */
  t(text: LocalizedText | undefined | null): string {
    if (!text) return '';
    return (this.lang() === 'en' && text.en) ? text.en : text.ro;
  }

  /** UI dictionary lookup. */
  ui(key: string): string {
    const entry = UI[key];
    if (!entry) return key;
    return this.lang() === 'en' ? (entry.en ?? entry.ro) : entry.ro;
  }

  difficulty(value: string | undefined): string {
    if (!value) return '';
    return this.lang() === 'en' ? (DIFFICULTY_EN[value] ?? value) : value;
  }
}

function readStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'en' || v === 'ro') return v;
  } catch { /* SSR / private mode */ }
  return 'ro';
}
