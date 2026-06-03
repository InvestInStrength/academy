import Link from "next/link";
import type { Metadata } from "next";

import { getActiveLanguage, getDictionary, getServerT, t } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getActiveLanguage());
  return {
    title: `${t(dict, "legal.agb")} — ${t(dict, "meta.brand")}`,
  };
}

// Verbatim content mirrored from investinstrength.com (Stand: Juni 2025).
const heading = "text-sm font-bold uppercase tracking-wide text-slate-900";
const para = "text-sm leading-relaxed text-slate-700";
const list = "list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700";

export default async function AgbPage() {
  const { t: tr } = await getServerT();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-6 py-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            AGB – INVEST IN STRENGTH Coaching &amp; Mentoring
          </h1>

          <section className="space-y-2">
            <h2 className={heading}>1. Anbieterinformationen</h2>
            <p className={para}>
              Maximilian Obrocki
              <br />
              E-Mail:{" "}
              <a
                href="mailto:investinstrength@gmail.com"
                className="text-brand-700 hover:underline"
              >
                investinstrength@gmail.com
              </a>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={heading}>2. Vertragsgegenstand</h2>
            <p className={para}>
              Der Vertrag bezieht sich auf die Durchführung von Coaching- und
              Mentoring-Dienstleistungen im Rahmen des Programms INVEST IN
              STRENGTH.
            </p>
            <p className={para}>
              Es handelt sich ausdrücklich um individuelle 1:1-Beratungsleistungen.
              Ziel ist die persönliche Begleitung und Reflexion – nicht die
              Vermittlung standardisierter Inhalte oder der Erwerb konkreten
              Wissens oder Fähigkeiten, wie es in Kursformaten üblich ist. Ein
              bestimmter Erfolg (z. B. körperlicher Fortschritt, gesundheitliche
              Verbesserung, unternehmerischer Gewinn) wird nicht geschuldet.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={heading}>3. Leistungsbeschreibung</h2>

            <p className="text-sm font-semibold text-slate-800">
              a) INVEST IN STRENGTH Coaching Paket
            </p>
            <ul className={list}>
              <li>Laufzeit: 6 Monate</li>
              <li>
                Inhalt:
                <ul className="mt-1 list-[circle] space-y-1 pl-5">
                  <li>6 Coaching-Calls à 45 Minuten via Zoom</li>
                  <li>
                    Betreuung via WhatsApp (Videoanalyse &amp; Beantwortung
                    individueller Fragen)
                  </li>
                  <li>
                    Reaktionszeit: max. 7 Kalendertage nach Eingang der Nachricht
                  </li>
                </ul>
              </li>
              <li>Preis: 3.000 EUR brutto, zahlbar sofort nach Rechnungserhalt</li>
            </ul>

            <p className="pt-2 text-sm font-semibold text-slate-800">
              b) INVEST IN STRENGTH Mentoring Paket
            </p>
            <ul className={list}>
              <li>Laufzeit: 3 Monate</li>
              <li>
                Inhalt:
                <ul className="mt-1 list-[circle] space-y-1 pl-5">
                  <li>
                    1 Zoom-Call à 60 Minuten pro Woche (insgesamt ca. 12 Sessions)
                  </li>
                  <li>Reine 1:1-Beratung – kein Kurs, keine Gruppenbegleitung</li>
                </ul>
              </li>
              <li>Preis: 4.000 EUR netto, zahlbar sofort nach Rechnungserhalt</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className={heading}>4. Terminvereinbarung &amp; Absage</h2>
            <p className={para}>
              Termine erfolgen durch den Klienten über Calendly oder nach
              Absprache. Nicht mindestens 24 Stunden vorher abgesagte Termine
              verfallen ersatzlos. Der Klient ist selbst verantwortlich, die im
              Zeitraum angebotenen Sessions zu buchen.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={heading}>5. Vertragslaufzeit &amp; Kündigung</h2>
            <p className={para}>
              Die Laufzeit beginnt mit dem Vertragsabschluss und endet automatisch
              nach dem jeweiligen Zeitraum (3 oder 6 Monate). Eine vorzeitige
              Kündigung durch den Klienten ist ausgeschlossen. Das gesetzliche
              Widerrufsrecht bleibt unberührt. Alle Regelungen dieser AGB gelten
              unabhängig davon, ob im Einzelfall eine andere Laufzeit oder ein
              abweichendes Honorar vereinbart wurde.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={heading}>6. Haftungsausschluss</h2>
            <p className={para}>
              Die Beratung erfolgt auf eigene Verantwortung des Klienten. Die
              Leistungen stellen keine medizinische, therapeutische oder
              psychologische Behandlung dar und ersetzen diese nicht. Der Coach
              haftet nur für Schäden, die vorsätzlich oder grob fahrlässig
              verursacht wurden.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className={heading}>7. Urheberrecht</h2>
            <p className={para}>
              Alle übermittelten Inhalte, Methoden oder Dokumente sind
              urheberrechtlich geschützt. Eine Weitergabe an Dritte oder
              öffentliche Nutzung ohne ausdrückliche Zustimmung ist untersagt.
            </p>
          </section>

          <hr className="border-slate-100" />

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Widerrufsbelehrung
            </h2>

            <div className="space-y-2">
              <h3 className={heading}>Widerrufsrecht</h3>
              <p className={para}>
                Verbraucher im Sinne des § 13 BGB haben das Recht, binnen 14 Tagen
                ohne Angabe von Gründen diesen Vertrag zu widerrufen.
              </p>
              <p className={para}>
                Die Frist beginnt mit dem Tag des Vertragsschlusses.
              </p>
              <p className={para}>
                Zur Ausübung des Widerrufsrechts genügt eine eindeutige Erklärung
                per E-Mail an:
              </p>
              <p className={para}>
                Maximilian Obrocki
                <br />
                <a
                  href="mailto:investinstrength@gmail.com"
                  className="text-brand-700 hover:underline"
                >
                  investinstrength@gmail.com
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <h3 className={heading}>
                Hinweis zum vorzeitigen Erlöschen des Widerrufsrechts
              </h3>
              <p className={para}>
                Das Widerrufsrecht erlischt vorzeitig, wenn du innerhalb der
                14-tägigen Frist deinen ersten Termin über Calendly buchst oder
                einen ersten Aufnahmetermin in Person (Face-to-Face) wahrnimmst und
                damit ausdrücklich zustimmst, dass der Anbieter vor Ablauf der
                Widerrufsfrist mit der Dienstleistung beginnt (§ 356 Abs. 5 BGB).
              </p>
            </div>

            <div className="space-y-2">
              <h3 className={heading}>Widerrufsfolgen</h3>
              <p className={para}>
                Im Falle eines Widerrufs werden bereits geleistete Zahlungen
                innerhalb von 14 Tagen zurückerstattet – auf demselben Zahlungsweg,
                sofern nichts anderes vereinbart wurde.
              </p>
            </div>
          </section>

          <p className="text-xs text-slate-400">Stand: Juni 2025</p>
        </CardContent>
      </Card>

      <Link
        href="/"
        className="block text-sm text-slate-500 hover:text-slate-900"
      >
        {tr("legal.back_home")}
      </Link>
    </div>
  );
}
