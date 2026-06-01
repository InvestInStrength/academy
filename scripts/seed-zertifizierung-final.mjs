// One-off seed for the final "Zertifizierung" course.
// Source: C:\Users\miche\Downloads\Zertifizierung Final.pdf
// Run:  node --env-file=.env.local scripts/seed-zertifizierung-final.mjs
// Safe to delete this file after the run.
//
// Writes both legacy and _de columns (matches the dual-write pattern admins
// use). EN columns stay NULL (English content is not authored yet).
// Marks correct options per the PDF's bold formatting. Question types are
// inferred from the prompt ("drei Komponenten"/"Zwei richtige Antworten"/
// "Kein Maximum…" => multiple_choice; otherwise single_choice).
// Questionnaire is created active=true with passing 80% and no shuffle so the
// topic-grouped flow is preserved.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function ins(table, row, select = "id") {
  const { data, error } = await db.from(table).insert(row).select(select).single();
  if (error) {
    console.error(`insert ${table} failed:`, error.message);
    process.exit(1);
  }
  return data;
}

// -- 1. Course ---------------------------------------------------------------
const course = await ins("courses", {
  title: "Invest in Strength — Methodik",
  title_de: "Invest in Strength — Methodik",
  description:
    "Theoriebasierte Zertifizierung zu struktureller Balance, Hypertrophie, Connective Tissue Work, Nervensystem, Schulter, Hüfte, systemischer Kraft und Faszien.",
  description_de:
    "Theoriebasierte Zertifizierung zu struktureller Balance, Hypertrophie, Connective Tissue Work, Nervensystem, Schulter, Hüfte, systemischer Kraft und Faszien.",
  active: true,
});
console.log("course:", course.id);

// -- 2. Topics ---------------------------------------------------------------
const topicSpecs = [
  { title: "Strukturelle Balance", code: "SB" },
  { title: "Hypertrophie & funktionelle Hypertrophie", code: "HYP" },
  { title: "Connective Tissue Work", code: "CTW" },
  { title: "Nervensystem", code: "NS" },
  { title: "Brustwirbelsäule & Schulter", code: "BWS" },
  { title: "Hüfte & unterer Rücken", code: "HUE" },
  { title: "Systemische Kraft", code: "SK" },
  { title: "Faszien & Meridiane", code: "FAS" },
];

const topicIds = {};
for (let i = 0; i < topicSpecs.length; i++) {
  const spec = topicSpecs[i];
  const row = await ins("course_topics", {
    course_id: course.id,
    title: spec.title,
    title_de: spec.title,
    code: spec.code,
    sort_order: i,
    active: true,
  });
  topicIds[spec.code] = row.id;
}
console.log("topics:", Object.keys(topicIds).length);

// -- 3. Questions ------------------------------------------------------------
/** Each question: { topic, text, type, options: [{text, correct}] } */
const questions = [
  // ----- Strukturelle Balance (Q1-10) -----
  {
    topic: "SB",
    text: "Spezifische muskuläre Kraft ist die Basis von:",
    type: "single_choice",
    options: [
      { text: "Ausdauer, Mobilität, Power, Hypertrophie & Nervensystem Regulation", correct: true },
      { text: "Ausdauer, hormoneller Balance, Hypertrophie & Power", correct: false },
      { text: "Hypertrophie, Power, Kraftausdauer, Balance & Koordination", correct: false },
    ],
  },
  {
    topic: "SB",
    text: "Nenne die drei Komponenten von struktureller Balance:",
    type: "multiple_choice",
    options: [
      { text: "Kraft Ratios erkennen und ausgleichen", correct: false },
      { text: "Core bzw. die Körpermitte trainieren (Spine First)", correct: true },
      { text: "Griffkraft und Fußmuskulatur auftrainieren", correct: false },
      { text: "Überkopfbeweglichkeit wiederherstellen", correct: false },
      { text: "Dysbalancen ausgleichen, aber vor allem die zwischen links und rechts", correct: true },
      { text: "Brustwirbelsäulenstreckung und Schulteraußenrotation verbessern", correct: false },
      {
        text: "Short Range Kraft von allen relevanten Muskeln trainieren und dann progressiv die Active Range of Motion verbessern",
        correct: true,
      },
      { text: "Tiefenmuskulatur kräftigen", correct: false },
      { text: "Spezifische funktionelle Übungen identifizieren und stärker werden", correct: false },
      { text: "Lokal schwache Strukturen wie Sehnen progressiv an Belastung gewöhnen", correct: false },
    ],
  },
  {
    topic: "SB",
    text:
      "Welche dieser Vorteile hat das Training der Short Range? Kein Maximum an möglichen richtigen Vorgaben!",
    type: "multiple_choice",
    options: [
      { text: "Verbessert die Durchblutung des lokalen Gewebes", correct: true },
      { text: "Garantie für muskuläre Aktivierung", correct: true },
      { text: "Gelenkschonend aufgrund von wenig Dehnung", correct: true },
      { text: "Short Range Kraft synergiert mit der End-Range Kraft des Antagonisten", correct: true },
      { text: "Reduziert fasziale Dehydrierungen sowie unnötiges Kollagen.", correct: true },
    ],
  },
  {
    topic: "SB",
    text:
      "Die Maximalkraftglockenkurve hat eine linke und eine rechte Seite. Wie heißen die beiden Pole?",
    type: "single_choice",
    options: [
      { text: "Spezifisch vs. Systemisch", correct: true },
      { text: "Neural vs. Hormonell", correct: false },
      { text: "Isolation vs. Grundübung", correct: false },
      { text: "Slow Control vs. Speed Strength", correct: false },
      { text: "Strength vs. Hypertrophy", correct: false },
    ],
  },
  {
    topic: "SB",
    text: "Am Beispiel des Quadrizeps. Womit teste ich am besten dessen spezifische Maximalkraft?",
    type: "single_choice",
    options: [
      { text: "Kniebeuge", correct: false },
      { text: "Step-Up", correct: false },
      { text: "Split Squat", correct: false },
      { text: "Kniestrecker", correct: true },
      { text: "Beinpresse", correct: false },
    ],
  },
  {
    topic: "SB",
    text:
      "Von welchen Muskeln spreche ich wenn ich die Körpermitte im Rahmen von struktureller Balance trainieren möchte?",
    type: "single_choice",
    options: [
      { text: "Glutäus, Rectus Abdominis & Erector Spinae", correct: true },
      { text: "Glutäus, Lattisimus & Transversus Abdominis", correct: false },
      { text: "Iliopsoas, Glutäus & Rectus Abdominis", correct: false },
    ],
  },
  {
    topic: "SB",
    text: "Grundlage vom Großteil aller Schmerzprobleme ist sofern ohne Unfall? Ein Mangel an…",
    type: "single_choice",
    options: [
      { text: "Mobilität", correct: false },
      { text: "Stabilität", correct: true },
      { text: "Koordination", correct: false },
      { text: "Kraft", correct: false },
      { text: "Makro- und Mikronährstoffen", correct: false },
    ],
  },
  {
    topic: "SB",
    text: "Was beschreibt der sogenannte Slack?",
    type: "single_choice",
    options: [
      {
        text: "Eine nicht kontrahierbare Länge eines Muskels. Ob zu kurz oder zu lang, spielt keine Rolle",
        correct: true,
      },
      {
        text: "Wenn fasziales Gewebe so weich ist, dass es zu schwach ist um Spannung zu übernehmen",
        correct: false,
      },
      {
        text: "Wenn die Gelenkintegrität so schlecht ist, dass die Stabilisatoren nicht arbeiten können",
        correct: false,
      },
    ],
  },
  {
    topic: "SB",
    text:
      "Was mache ich, wenn der Zielmuskel NICHT ohne Schmerzen trainierbar ist? Zwei richtige Antworten",
    type: "multiple_choice",
    options: [
      { text: "Den Muskel trainieren, der in der gleichen Kette angrenzend in Richtung Körpermitte liegt", correct: true },
      { text: "Isometrisch an der Schmerzgrenze überladen", correct: false },
      { text: "Den gleichen Muskel auf der anderen Körperseite trainieren", correct: false },
      { text: "Muskel dehnen und erneut versuchen", correct: false },
      { text: "Eine systemischere Übung wählen, bei der mehr Muskulatur insgesamt beteiligt ist", correct: true },
    ],
  },
  {
    topic: "SB",
    text: "Was folgt in der athletischen Entwicklung nach der strukturellen Balance?",
    type: "single_choice",
    options: [
      { text: "Connective Tissue Work", correct: false },
      { text: "Hypertrophie", correct: true },
      { text: "Functional Pattern Integration", correct: false },
      { text: "Funktionelle Hypertrophie", correct: false },
      { text: "Work Capacity", correct: false },
    ],
  },

  // ----- Hypertrophie & funktionelle Hypertrophie (Q11-12) -----
  {
    topic: "HYP",
    text:
      "Was ist in der athletischen Entwicklung unabhängig von Rehabilitation der wichtigste Grund für Hypertrophie?",
    type: "single_choice",
    options: [
      { text: "Body Composition", correct: false },
      { text: "Hormonelle Balance", correct: false },
      { text: "Abstand von Muskel zu Knochen und deswegen besserer Hebel", correct: false },
      { text: "Größeres Muskelkraftdefizit und daraus entstehendes Progressionspotential", correct: true },
      { text: "Blutzuckerstabilität und größere Glykogenspeicher", correct: false },
    ],
  },
  {
    topic: "HYP",
    text: "Was beschreibt am besten unser Ziel, wenn wir funktionelle Hypertrophie trainieren?",
    type: "single_choice",
    options: [
      { text: "Relativkraftübungen wie Klimmzüge im Wiederholungsbereich 6-8 Wiederholungen", correct: false },
      { text: "Myofibrillare Hypertrophie also die Vergrößerung des Muskelfaserquerschnitts", correct: false },
      { text: "Die simultane Steigerung von Kraft und Muskelmasse", correct: false },
      { text: "Kraft- und Muskelzuwächse ohne Gewichtszunahme", correct: false },
      {
        text: "Training der Ansteuerung und muskulären Kontrolle von Prime Modern während komplexen Bewegungsmustern",
        correct: true,
      },
    ],
  },

  // ----- Connective Tissue Work (Q13-16) -----
  {
    topic: "CTW",
    text: "Was macht der Golgi-Sehnen Apparat?",
    type: "single_choice",
    options: [
      {
        text: "Misst die Spannung auf der Sehne und hemmt bei Schädigung Muskelaktivität und Range of Motion",
        correct: true,
      },
      {
        text: "Muskel- und Sehnenlänge und sorgt für das schnelle und starke Verkürzen, auch Stretch Reflex genannt",
        correct: false,
      },
      {
        text: "Empfängt hormonelle Signale wie Cortisolspitzen um Schmerzwahrnehmung kurzfristig zu reduzieren",
        correct: false,
      },
      {
        text: "Misst Vagusnervaktivität und erhöht daraufhin den Ausstoß von Adrenalin und Noradrenalin",
        correct: false,
      },
    ],
  },
  {
    topic: "CTW",
    text: "Was ist die klassische Übungsgruppe für das Überladen des Bindegewebes?",
    type: "single_choice",
    options: [
      { text: "Loaded Stretches", correct: true },
      { text: "Accommodated Resistance (veränderte Widerstandskurven durch bspw. Bänder)", correct: false },
      { text: "Eccentric Overload", correct: false },
      { text: "Super Slow (bspw. 5050)", correct: false },
      { text: "Pre-Fatigue (Isolation direkt gefolgt von Integration)", correct: false },
    ],
  },
  {
    topic: "CTW",
    text:
      "Wenn in End Range Positionen kein Dehnungsgefühl, sondern ein punktueller Schmerz entsteht, dann machst du was?",
    type: "single_choice",
    options: [
      { text: "Isometrische Überladung bei 25-50% verringerter Range of Motion", correct: true },
      { text: "Frequenz dieser Übung erhöhen um mehr Ansteuerung der Muskulatur zu erreichen", correct: false },
      { text: "Muskulatur in einem passiven Stretch ohne externen Widerstand vordehnen", correct: false },
      { text: "15g Kollagenpeptide und 50mg Vitamin C direkt vor dem Training einbauen", correct: false },
      { text: "Mehr Einsatz von Ankerpunkten wie Händen, Füßen oder des Kopfes", correct: false },
    ],
  },
  {
    topic: "CTW",
    text: "Was sind die Big Five von Connective Tissue Work?",
    type: "single_choice",
    options: [
      { text: "Poliquin Fly, JC Pullover, Incline Curl, Split Squat & Jefferson Curl", correct: true },
      { text: "Poliquin Step-Up, Romanian Deadlift, Bent Over Row, Dip & Chin-Up", correct: false },
      { text: "Poliquin Fly & Step-Up, Kniender Beincurl, Defizit Push-Ups, Ab-Rollout", correct: false },
      { text: "Adduktoren Butterfly Stretch, Incline Pidgeon, Incline Curl, Pistol Squat & Poliquin Fly", correct: false },
    ],
  },

  // ----- Nervensystem (Q17-20) -----
  {
    topic: "NS",
    text: "Was braucht am längsten für die Regeneration nach dem Training?",
    type: "single_choice",
    options: [
      { text: "Muskulatur", correct: false },
      { text: "Nervensystem", correct: false },
      { text: "Glykogen und Kreatinphosphat", correct: false },
      { text: "Bindegewebe", correct: true },
    ],
  },
  {
    topic: "NS",
    text: "Was hat den größten Einfluss auf das Ausmaß an Muskelspannung?",
    type: "single_choice",
    options: [
      { text: "Intention", correct: true },
      { text: "Externer Widerstand", correct: false },
      { text: "Wiederholungsbereich", correct: false },
      { text: "Übungsauswahl", correct: false },
      { text: "Qualität der Ausführung", correct: false },
    ],
  },
  {
    topic: "NS",
    text:
      "Was passiert, wenn du eine Langhantel aus dem Rack nimmst deren Gewicht oberhalb von 70% deines 1RM liegt",
    type: "single_choice",
    options: [
      { text: "Sympathikusaktivität und fasziale bzw. systemische Spannung steigt", correct: true },
      {
        text: "Nervensystem bereitet sich auf hohe Rekrutierung von Schnellzuckenden Muskelfasern vor",
        correct: false,
      },
      {
        text: "Direkte Sekretion von Testosteron und Wachstumshormonen um das Gewicht bewegen und darauf adaptieren zu können",
        correct: false,
      },
      {
        text: "Relevante Muskeln wie Quads und Glutes werden aktiviert und Wahrnehmung fokussiert sich auf diese",
        correct: false,
      },
    ],
  },
  {
    topic: "NS",
    text: "Was passiert, wenn wir von technischem Versagen sprechen?",
    type: "single_choice",
    options: [
      {
        text: "System muss Muskulatur aus anderen myofaszialen Ketten mit rekrutieren und Last teilweise sogar an passive Strukturen wie Sehnen, Knochen und Gelenke abgeben",
        correct: true,
      },
      { text: "Technik entspricht nicht mehr den Qualitätsstandards", correct: false },
      {
        text: "Tempo kann nicht aufrechterhalten werden und wird in der Exzentrik schneller und in der Konzentrik langsamer",
        correct: false,
      },
      { text: "Es wird nicht die Anzahl an Wiederholungen erreicht, die programmiert wurden", correct: false },
    ],
  },

  // ----- Brustwirbelsäule & Schulter (Q21-24) -----
  {
    topic: "BWS",
    text: "Wofür brauchen wir die Rotatorenmanschette?",
    type: "single_choice",
    options: [
      {
        text: "Gelenkintegrität und daraus entstehend bessere Ansteuerung der Schultermuskulatur insgesamt",
        correct: true,
      },
      { text: "Stabilität & Schutz vor großen externen Widerständen", correct: false },
      { text: "Optimale Beweglichkeit über Kopf und hinter dem Körper", correct: false },
      { text: "Ballistische Krafterzeugung wie beim Werfen oder Boxen", correct: false },
    ],
  },
  {
    topic: "BWS",
    text: "Was ist der mit Abstand wichtigste High Load Stabilisator für den Schulterkopf?",
    type: "single_choice",
    options: [
      { text: "Triceps Brachii", correct: false },
      { text: "Serratus Anterior", correct: false },
      { text: "Trapezius", correct: false },
      { text: "Pectoralis Major", correct: true },
      { text: "Deltoideus", correct: false },
    ],
  },
  {
    topic: "BWS",
    text: "Welche dieser Schulterblattpositionen ist am wichtigsten?",
    type: "single_choice",
    options: [
      { text: "Protraktion", correct: false },
      { text: "Retraction", correct: false },
      { text: "Depression", correct: false },
      { text: "Elevation", correct: false },
      { text: "Alle 4 sind wichtig", correct: true },
    ],
  },
  {
    topic: "BWS",
    text: "Schulterbeschwerden entstehen bei Overuse von welchem Klimmzugmuster?",
    type: "single_choice",
    options: [
      { text: "Lattissimus Dominant", correct: false },
      { text: "Bizeps Dominant", correct: false },
      { text: "Teres Major Dominant", correct: true },
      { text: "Ausgeglichenes Klimmzugmuster", correct: false },
    ],
  },

  // ----- Hüfte & unterer Rücken (Q25-26) -----
  {
    topic: "HUE",
    text:
      "Was ist die Kraft Ratio Nummer 1 die wir in der Reha für den unteren Rücken und Hüfte als Erstes Anstreben?",
    type: "single_choice",
    options: [
      { text: "Backextension 120s Top Hold", correct: true },
      { text: "Single Leg Back Extension 60s Top Hold", correct: false },
      { text: "Split Squat - volle Range of Motion 6 Reps mit 3310 Tempo", correct: false },
      { text: "Deadlift mit 1,5-fachen Körpergewicht", correct: false },
      { text: "Kniebeuge mit 1,2-fachen Körpergewicht", correct: false },
      { text: "Quadratus Lumborum Side Crunch 20 Reps", correct: false },
    ],
  },
  {
    topic: "HUE",
    text: "Zu welcher dieser Beschwerdetypen tendiert die Hüfte aus anatomischer Sicht am meisten?",
    type: "single_choice",
    options: [
      { text: "Instabilität", correct: false },
      { text: "Steifigkeit oder Impingement", correct: false },
      { text: "Sehnenansatzentzündung", correct: false },
      { text: "Gelenkverschleiß", correct: true },
    ],
  },

  // ----- Systemische Kraft (Q27-28) -----
  {
    topic: "SK",
    text: "Was sind die drei Ankerpunkte die ich mehr einsetzen muss, um mehr systemische Kraft zu erhalten?",
    type: "single_choice",
    options: [
      { text: "Hände, Füße und Kopf", correct: true },
      { text: "Glutäus, Rectus Abdominis und Erector Spinae", correct: false },
      { text: "Gebiss, Hände und Beckenboden", correct: false },
      { text: "Beckenboden, Zwerchfell und Transversus Abdominis", correct: false },
    ],
  },
  {
    topic: "SK",
    text: "Wofür brauche ich systemische Kraft?",
    type: "single_choice",
    options: [
      { text: "Athletische Leistungsfähigkeit", correct: true },
      { text: "Resilienz des Nervensystems", correct: false },
      { text: "Metabole Gesundheit", correct: false },
      { text: "Prähabilitation bzw. Reduzierung des Verletzungsrisikos", correct: false },
      { text: "Knochendichte", correct: false },
      { text: "Hormonelle Balance", correct: false },
      { text: "Basis für alle anderen Kraftqualitäten", correct: false },
    ],
  },

  // ----- Faszien & Meridiane (Q29-32) -----
  {
    topic: "FAS",
    text: "Welche dieser Eigenschaften ist keine Eigenschaft von Fasziengewebe?",
    type: "single_choice",
    options: [
      { text: "Viskosität", correct: false },
      { text: "Kontraktilität", correct: false },
      { text: "Langsame Adaptabilität", correct: false },
      { text: "Elastizität", correct: false },
      { text: "Plastizität", correct: false },
      { text: "Schnelle Adaptabilität", correct: true },
      { text: "Sensorik", correct: false },
    ],
  },
  {
    topic: "FAS",
    text:
      "Welche dieser myofaszialen Linien kann nur Länge zulassen, wenn wir stärker in den anderen Linien werden?",
    type: "single_choice",
    options: [
      { text: "Spirallinie", correct: false },
      { text: "Funktionelle Linie", correct: false },
      { text: "Tiefe Frontallinie", correct: true },
      { text: "Oberflächliche Rückenlinie", correct: false },
      { text: "Seitliche Linie", correct: false },
      { text: "Oberflächliche Frontallinie", correct: false },
    ],
  },
  {
    topic: "FAS",
    text: "Welcher dieser Anteile ist nicht Teil der oberflächlichen Rückenlinie?",
    type: "single_choice",
    options: [
      { text: "Beinbeuger", correct: false },
      { text: "Glutäus", correct: true },
      { text: "Plantarfaszie", correct: false },
      { text: "Erector Spinae", correct: false },
      { text: "Lig. Nuchae", correct: false },
    ],
  },
  {
    topic: "FAS",
    text:
      "Was ist die Basis der Funktionsweise aller myofaszialen Verbindungen, ausgenommen der Armlinien?",
    type: "single_choice",
    options: [
      { text: "Hohe Nervensystemaktivität", correct: false },
      { text: "Beckenkontrolle", correct: true },
      { text: "Elastizität der faszialen Anteile", correct: false },
      { text: "Optimale Überkopfkniebeuge", correct: false },
      { text: "Aktivität der Tiefenmuskulatur", correct: false },
    ],
  },
];

if (questions.length !== 32) {
  console.error(`Expected 32 questions, have ${questions.length}.`);
  process.exit(1);
}

// Insert questions + options in order.
const questionIds = [];
for (let i = 0; i < questions.length; i++) {
  const q = questions[i];
  const topicId = topicIds[q.topic];
  if (!topicId) {
    console.error(`Unknown topic code: ${q.topic}`);
    process.exit(1);
  }
  const inserted = await ins("questions", {
    course_id: course.id,
    topic_id: topicId,
    question_text: q.text,
    question_text_de: q.text,
    question_type: q.type,
    active: true,
  });
  const optionRows = q.options.map((option, idx) => ({
    question_id: inserted.id,
    option_text: option.text,
    option_text_de: option.text,
    is_correct: option.correct,
    sort_order: idx,
  }));
  const { error } = await db.from("question_options").insert(optionRows);
  if (error) {
    console.error(`option insert failed for Q${i + 1}:`, error.message);
    process.exit(1);
  }
  questionIds.push(inserted.id);
}
console.log("questions:", questionIds.length);

// -- 4. Questionnaire --------------------------------------------------------
const questionnaire = await ins("questionnaires", {
  course_id: course.id,
  title: "Invest in Strength — Zertifizierungstest",
  title_de: "Invest in Strength — Zertifizierungstest",
  description:
    "Theorie-Zertifizierungstest. Bestehensgrenze 80%. Fragen folgen der thematischen Reihenfolge (Strukturelle Balance → Hypertrophie → CTW → Nervensystem → Schulter → Hüfte → Systemische Kraft → Faszien).",
  description_de:
    "Theorie-Zertifizierungstest. Bestehensgrenze 80%. Fragen folgen der thematischen Reihenfolge (Strukturelle Balance → Hypertrophie → CTW → Nervensystem → Schulter → Hüfte → Systemische Kraft → Faszien).",
  passing_percentage: 80,
  randomize_question_order: false,
  randomize_answer_order: false,
  active: true,
});

const linkRows = questionIds.map((question_id, i) => ({
  questionnaire_id: questionnaire.id,
  question_id,
  sort_order: i,
}));
const { error: linkError } = await db.from("questionnaire_questions").insert(linkRows);
if (linkError) {
  console.error("link insert failed:", linkError.message);
  process.exit(1);
}

console.log("");
console.log("DONE");
console.log("course_id:        ", course.id);
console.log("questionnaire_id: ", questionnaire.id, "(active=true, passing 80%)");
console.log("topics:           ", Object.keys(topicIds).length);
console.log("questions:        ", questionIds.length);
