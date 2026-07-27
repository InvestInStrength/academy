// Seeds the "Applied Shoulder Biomechanics" seminar, its question bank and its
// certification test, from "Fragen Zertifizierung.pdf".
//
//   node scripts/seed-shoulder-biomechanics.mjs [--dry-run]
//
// Requires migration 0007_seminars.sql to be applied first (the script checks)
// and NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
//
// Idempotent: matches the seminar by title and each question by its German
// text, so re-running updates rather than duplicating.
//
// NOT SEEDED — three questions in the source PDF have no answer options:
//   Q2  "Wofür brauchen wir die Rotatorenmanschette?"            (marked "Frage existiert bereits")
//   Q4  "Welche dieser Schulterblattpositionen ist am wichtigsten?" (marked "Frage existiert bereits")
//   Q6  "Was ist mit Abstand der wichtigste High Load Stabilisator für die Schulter selbst?"
// Add them to the test by hand from the existing question bank.
//
// Answers marked correct below are the ones underlined in the source PDF.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

const SEMINAR_TITLE = "Applied Shoulder Biomechanics";
const TEST_TITLE = "Applied Shoulder Biomechanics — Zertifizierungstest";
const PASSING_PERCENTAGE = 80;

/** `correct` holds the 0-based indices of the options underlined in the PDF.
 * A question with more than one correct option is multiple choice. */
const QUESTIONS = [
  {
    number: 1,
    text: "Was ist der Ursprung aller Schulterbeschwerden?",
    options: [
      "Eingeschränkte Innen- und Außenrotation",
      "Übermäßige Protraktion der Schulterblätter und ein ventral (vorne) stehender Schulterkopf",
      "Instabilität bzw. Inaktivität der großen Stabilisatoren",
      "Dehydrierung der Faszialen Strukturen und daraus entstehend eine unzureichende Überkopfmobilität sowie hinter den Rücken",
      "Neurale Kompression in der HWS oder lokal (Thoracic Outlet Syndrome)",
    ],
    correct: [2],
  },
  {
    number: 3,
    text: "Was sind die 4 wichtigsten Muskeln, die die Schulterblattposition bestimmen? (4 richtige Antworten)",
    options: [
      "M. Levator Scapulae",
      "M. Bizeps Brachii (kurzer Kopf)",
      "M. Infraspinatus",
      "M. Trapezius Pars Ascendens (Unterer Anteil)",
      "Mm. Rhomboiden",
      "M. Serratus Anterior",
      "M. Trapezius Pars Descendens (oberer Anteil)",
      "M. Pectoralis Major",
      "M. Pectoralis Minor",
      "M. Coracobrachialis",
      "Kiefermuskulatur",
      "Zwerchfell (Lunge)",
    ],
    correct: [3, 4, 5, 8],
  },
  {
    number: 5,
    text: "Wenn die Schultermobilität lokal nicht eingeschränkt ist und dennoch schmerzt, dann ist das Problem meist?",
    options: [
      "Strength Ratio zwischen Klimmzug und KH Schrägbankcurl nicht angeglichen",
      "Streitigkeiten im Subscapularis sowie im Teres Minor",
      "Übermäßige Spannung im oberen Trapez, Deltoideus sowie in der Kiefermuskulatur",
      "Schwache Schulterblattretraktoren bzw. anbindende Muskulatur hinten",
      "Eingeschränkte Mobilität & Stabilität in der BWS, LWS und im Brustkorb",
    ],
    correct: [4],
  },
  {
    number: 7,
    text: "Welche zwei Muskeln beeinträchtigen bei einer Dysfunktion am häufigsten die optimale Schulterfunktion? (2 richtige Antworten)",
    options: [
      "M. Levator Scapulae",
      "M. Trizeps Brachii",
      "M. Deltoideus (vorderer Anteil)",
      "M. Bizeps Brachii (kurzer Kopf)",
      "M. Bizeps Brachii (langer Kopf)",
      "M. Pectoralis Minor",
    ],
    correct: [3, 5],
  },
  {
    number: 8,
    text: "Welcher Mechanismus führt zu einer konstanten Überdehnung und Überlastung der langen Bizepssehne?",
    options: [
      "Übermäßiges Ventralgleiten des Humeruskopfes insb. bei Retroversion und Abduktion",
      "Instabilität der Halswirbelsäule insb. hochzervikal",
      "Übermäßige Steilstellung der Rippen durch Lungendysfunktion und Störung des Scapulo-Thorakalen Gleitlagers",
      "Inaktivität des Lattissimus bei gleichzeitig zu hoher Spannung in der Brustmuskulatur",
      "Einklemmung der Sehne zwischen Sehnenkanal und Schulterdach",
    ],
    correct: [0],
  },
  {
    number: 9,
    text: "Welche myofasziale Linie wollen wir IMMER aktivieren und trainieren, unabhängig davon welches Schulterbeschwerdemuster vorliegt?",
    options: [
      "Deep Front Arm Line",
      "Back Functional Line",
      "Spiral Line",
      "Superficial Front Arm Line",
      "Superficial Back Arm Line",
      "Deep Back Arm Line",
    ],
    correct: [3],
  },
  {
    number: 10,
    text: "Was sind die drei wichtigsten Bestandteile der Superficial Front Arm Line? (3 richtige Antworten)",
    options: [
      "Rectus Abdominis",
      "M. Bizeps Brachii",
      "M. Pectoralis Major",
      "M. Pectoralis Minor",
      "Unterarmflexoren",
      "Thenarmuskulatur (Daumenmuskeln)",
      "M. Latissimus Dorsi",
    ],
    correct: [2, 4, 6],
  },
  {
    number: 11,
    text: "Was für ein typisches Beschwerdebild macht eine übermäßige Repräsentation der Deep Front & Back Arm Lines im Alltag?",
    options: [
      "Nackenschmerzen aufgrund von der in Adduktion entstehenden Verbindung aus Bizeps und oberen Trapez",
      "Tennis- und/oder Golferellenbogen",
      "Einschlafen der äußeren Handkante insb. nachts",
      "Daumengelenksarthrose",
      "Ansatzsehnenreizungen insb. des Trizeps Brachii am Ellenbogen",
      "Scapula Alata (Abstehen der Schulterblätter)",
    ],
    correct: [0],
  },
  {
    number: 12,
    text: "Warum sind Pectoralis Major und Latissimus Dorsi funktionell so unglaublich wichtig?",
    options: [
      "Weil sie beide außerdem zu den Functional Lines gehören und deswegen bei athletischen Bewegungen so wichtig sind",
      "Große Muskeln viel Glukose speichern",
      "Sie die stärksten Rotatoren sowie Antirotatoren des Oberkörpers sind",
      "Größtes Kraftpotential im gesamten Schulter-Nackenbereich haben",
      "Übermäßige Aktivität der Atemhilfsmuskulatur reduzieren",
    ],
    correct: [0],
  },
  {
    number: 13,
    text: "Was ist IMMER unser erster Schritt bei Schulterbeschwerden?",
    options: [
      "Pectoralis Major und Bizeps Muskulatur in Short Range aktivieren",
      "Rotatorenmanschette aktivieren und kräftigen",
      "Pectoralis und Lattissimus dehnen",
      "Nackenstabilität bspw. durch Neck Bridges trainieren",
      "Spezifisches Training der Schulterblattstabilisatoren",
    ],
    correct: [0],
  },
  {
    number: 14,
    text: "Was ist mit Abstand die beste Übung um die Deep Front Arm Line zu öffnen?",
    options: [
      "Kurzhantel Überzüge auf der Flachbank",
      "Dips mit Kopf nach unten",
      "KH Trap-3 Raise auf der 45° Schrägbank",
      "LH Cuban Press im Stehen",
      "KH Poliquin Flys",
      "45° Kurzhantel Schrägbankcurls – neutral – normal oder in Steigerung Comerford Style",
    ],
    correct: [5],
  },
  {
    number: 15,
    // SOURCE INCONSISTENCY: the question asks for two ratios but only one option
    // is underlined in the PDF. Seeded as single choice with the marked answer —
    // mark the second correct option in the admin and switch it to multiple
    // choice if two were intended.
    text: "In Richtung welcher Kraft-Ratios wollen wir uns in der Schulter-Rehabilitation entwickeln?",
    options: [
      "Klimmzug 50% auf 3",
      "Dip 50% auf 3",
      "Langhantel Nackendrücken im Stehen 66% Bodyweight auf 63,75% auf 6",
      "45° KH Schrägbankdrücken 50% pro Hand auf 6",
      "30° KH Schrägbankcurls – neutral – 25% pro Hand auf 6",
    ],
    correct: [2],
  },
];

// --- env -------------------------------------------------------------------

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)",
  );
  process.exit(1);
}

const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function label(q) {
  return `Q${q.number} ${q.text.slice(0, 48)}…`;
}

// --- preflight -------------------------------------------------------------

for (const q of QUESTIONS) {
  if (q.correct.length === 0 || Math.max(...q.correct) >= q.options.length) {
    console.error(`bad answer key for ${label(q)}`);
    process.exit(1);
  }
}

if (DRY_RUN) {
  console.log(`dry run — would seed:`);
  console.log(`  seminar   ${SEMINAR_TITLE}`);
  console.log(`  test      ${TEST_TITLE} (${PASSING_PERCENTAGE}%)`);
  console.log(`  questions ${QUESTIONS.length}`);
  for (const q of QUESTIONS) {
    const type = q.correct.length > 1 ? "multi " : "single";
    console.log(
      `    ${type} ${String(q.number).padStart(2)} ${q.options.length} options, ${q.correct.length} correct`,
    );
  }
  process.exit(0);
}

const { error: kindError } = await client.from("courses").select("kind").limit(1);
if (kindError) {
  console.error(`
Migration 0007_seminars.sql has not been applied yet (courses.kind is missing).

Run supabase/migrations/0007_seminars.sql in the Supabase SQL editor, then
re-run this script.

  (${kindError.message})`);
  process.exit(1);
}

// --- seminar ---------------------------------------------------------------

const { data: existingSeminar } = await client
  .from("courses")
  .select("id")
  .eq("title", SEMINAR_TITLE)
  .eq("kind", "seminar")
  .maybeSingle();

const seminarRow = {
  kind: "seminar",
  title: SEMINAR_TITLE,
  title_de: SEMINAR_TITLE,
  description: "Online-Seminar der Advanced Joint Rehabilitation Series.",
  description_de: "Online-Seminar der Advanced Joint Rehabilitation Series.",
  active: true,
};

const { data: seminar, error: seminarError } = existingSeminar
  ? await client
      .from("courses")
      .update(seminarRow)
      .eq("id", existingSeminar.id)
      .select("id")
      .single()
  : await client.from("courses").insert(seminarRow).select("id").single();

if (seminarError) {
  console.error("seminar failed:", seminarError.message);
  process.exit(1);
}
console.log(`${existingSeminar ? "updated" : "created"} seminar ${seminar.id}`);

// --- questions -------------------------------------------------------------

const questionIds = [];

for (const q of QUESTIONS) {
  const questionType = q.correct.length > 1 ? "multiple_choice" : "single_choice";

  const { data: existingQuestion } = await client
    .from("questions")
    .select("id")
    .eq("course_id", seminar.id)
    .eq("question_text", q.text)
    .maybeSingle();

  const questionRow = {
    course_id: seminar.id,
    question_text: q.text,
    question_text_de: q.text,
    question_type: questionType,
    active: true,
  };

  const { data: question, error: questionError } = existingQuestion
    ? await client
        .from("questions")
        .update(questionRow)
        .eq("id", existingQuestion.id)
        .select("id")
        .single()
    : await client.from("questions").insert(questionRow).select("id").single();

  if (questionError) {
    console.error(`${label(q)} failed:`, questionError.message);
    process.exit(1);
  }

  // Options are replaced wholesale so a re-run reflects edits to this file
  // rather than accumulating duplicates.
  await client.from("question_options").delete().eq("question_id", question.id);
  const { error: optionsError } = await client.from("question_options").insert(
    q.options.map((text, index) => ({
      question_id: question.id,
      option_text: text,
      option_text_de: text,
      is_correct: q.correct.includes(index),
      sort_order: index,
    })),
  );
  if (optionsError) {
    console.error(`${label(q)} options failed:`, optionsError.message);
    process.exit(1);
  }

  questionIds.push(question.id);
  console.log(
    `  ${existingQuestion ? "updated" : "created"} ${questionType === "multiple_choice" ? "multi " : "single"} Q${q.number}`,
  );
}

// --- test ------------------------------------------------------------------

const { data: existingTest } = await client
  .from("questionnaires")
  .select("id")
  .eq("course_id", seminar.id)
  .eq("title", TEST_TITLE)
  .maybeSingle();

const testRow = {
  course_id: seminar.id,
  title: TEST_TITLE,
  title_de: TEST_TITLE,
  passing_percentage: PASSING_PERCENTAGE,
  randomize_question_order: false,
  randomize_answer_order: false,
  active: true,
};

const { data: test, error: testError } = existingTest
  ? await client
      .from("questionnaires")
      .update(testRow)
      .eq("id", existingTest.id)
      .select("id")
      .single()
  : await client.from("questionnaires").insert(testRow).select("id").single();

if (testError) {
  console.error("test failed:", testError.message);
  process.exit(1);
}

// Reconcile rather than replace. Deleting every link and re-inserting the
// scripted 12 would silently destroy questions an admin added through the UI —
// including the three the script itself tells them to add (Q2, Q4, Q6), i.e.
// exactly the window the operator is directed into. Links this script did not
// create are left alone.
const { data: existingLinks, error: readLinksError } = await client
  .from("questionnaire_questions")
  .select("id, question_id, sort_order")
  .eq("questionnaire_id", test.id);

if (readLinksError) {
  console.error("reading existing links failed:", readLinksError.message);
  process.exit(1);
}

const linkByQuestion = new Map(
  (existingLinks ?? []).map((row) => [row.question_id, row]),
);

const toInsert = [];
for (const [index, questionId] of questionIds.entries()) {
  const existingLink = linkByQuestion.get(questionId);
  if (!existingLink) {
    toInsert.push({
      questionnaire_id: test.id,
      question_id: questionId,
      sort_order: index,
    });
  } else if (existingLink.sort_order !== index) {
    const { error } = await client
      .from("questionnaire_questions")
      .update({ sort_order: index })
      .eq("id", existingLink.id);
    if (error) {
      console.error("reordering failed:", error.message);
      process.exit(1);
    }
  }
}

if (toInsert.length > 0) {
  const { error: linkError } = await client
    .from("questionnaire_questions")
    .insert(toInsert);
  if (linkError) {
    console.error("linking questions failed:", linkError.message);
    process.exit(1);
  }
}

const kept = (existingLinks ?? []).filter(
  (row) => !questionIds.includes(row.question_id),
);
if (kept.length > 0) {
  console.log(
    `  kept ${kept.length} question(s) added outside this script (not touched)`,
  );
}

console.log(`${existingTest ? "updated" : "created"} test ${test.id}`);
console.log(`
done.
  seminar   /admin/seminars/${seminar.id}
  test      /admin/questionnaires/${test.id}  (${questionIds.length} questions, pass ${PASSING_PERCENTAGE}%)

Still to do by hand:
  - set the seminar's event date and certificate template
  - add the three questions that had no options in the PDF (Q2, Q4, Q6)`);
