// Kategorie-spezifische FAQs für die Service-Seiten

export interface FAQ {
  question: string;
  answer: string;
}

export interface CategoryFAQs {
  [key: string]: FAQ[];
}

export const categoryFaqs: CategoryFAQs = {
  'Handwerk': [
    {
      question: 'Was kostet ein Handwerker pro Stunde?',
      answer: 'Die Stundensätze variieren je nach Gewerk und Region. Elektriker und Klempner liegen typischerweise bei 45-65 Euro/Stunde, Maler bei 35-50 Euro/Stunde. Auf Taskilo können Sie transparent Angebote vergleichen und den besten Preis für Ihr Projekt finden.'
    },
    {
      question: 'Wie finde ich einen zuverlässigen Handwerker?',
      answer: 'Auf Taskilo sind alle Handwerker verifiziert und bewertet. Achten Sie auf die Kundenbewertungen, die Anzahl abgeschlossener Projekte und die Reaktionszeit. Unser Escrow-System schützt Ihre Zahlung bis zur erfolgreichen Fertigstellung.'
    },
    {
      question: 'Welche Handwerksleistungen kann ich auf Taskilo buchen?',
      answer: 'Von Elektroinstallationen über Sanitärarbeiten bis hin zu Malerarbeiten, Fliesenlegen, Tischlerarbeiten und Dachdeckerarbeiten - wir haben Experten für alle Handwerksgewerke. Beschreiben Sie einfach Ihr Projekt und erhalten Sie passende Angebote.'
    },
    {
      question: 'Wie schnell kann ein Handwerker bei mir vor Ort sein?',
      answer: 'Je nach Dringlichkeit und Verfügbarkeit können Handwerker auf Taskilo oft schon innerhalb von 24-48 Stunden bei Ihnen sein. Für Notfälle wie Rohrbrüche oder Stromausfälle gibt es Anbieter mit Express-Service.'
    },
    {
      question: 'Sind die Handwerker auf Taskilo versichert?',
      answer: 'Ja, alle professionellen Handwerker auf Taskilo müssen eine Betriebshaftpflichtversicherung nachweisen. Das gibt Ihnen Sicherheit bei jedem Auftrag.'
    }
  ],
  'Haushalt': [
    {
      question: 'Was kostet eine Reinigungskraft pro Stunde?',
      answer: 'Die Stundensätze für Haushaltshilfen liegen typischerweise zwischen 15-25 Euro pro Stunde, je nach Region und Aufgabenbereich. Auf Taskilo finden Sie transparente Preise ohne versteckte Kosten.'
    },
    {
      question: 'Wie oft sollte ich eine Haushaltshilfe buchen?',
      answer: 'Das hängt von Ihren Bedürfnissen ab. Viele Kunden buchen wöchentlich oder alle zwei Wochen eine Grundreinigung. Bei größeren Haushalten oder wenig Zeit kann auch eine regelmäßigere Unterstützung sinnvoll sein.'
    },
    {
      question: 'Was ist im Preis einer Hausreinigung enthalten?',
      answer: 'Eine Standard-Hausreinigung umfasst typischerweise Staubsaugen, Wischen, Bad- und Küchenreinigung sowie Staubwischen. Zusatzleistungen wie Fensterputzen oder Bügelservice können separat gebucht werden.'
    },
    {
      question: 'Muss ich Reinigungsmittel stellen?',
      answer: 'Das ist unterschiedlich und wird im Angebot klar kommuniziert. Viele Reinigungskräfte bringen eigene professionelle Reinigungsmittel mit, andere nutzen Ihre vorhandenen Produkte.'
    },
    {
      question: 'Wie werden Haushaltshilfen auf Taskilo geprüft?',
      answer: 'Alle Anbieter durchlaufen einen Verifizierungsprozess. Zudem können Sie Kundenbewertungen einsehen und so die zuverlässigsten Helfer finden. Unser Bewertungssystem sorgt für Transparenz und Qualität.'
    }
  ],
  'Transport': [
    {
      question: 'Was kostet ein Umzugshelfer pro Stunde?',
      answer: 'Umzugshelfer kosten auf Taskilo typischerweise 20-35 Euro pro Stunde. Bei größeren Umzügen mit Transporter können Pauschalpreise günstiger sein. Holen Sie sich mehrere Angebote zum Vergleich.'
    },
    {
      question: 'Wie finde ich einen günstigen Umzugsservice?',
      answer: 'Auf Taskilo können Sie Angebote verschiedener Anbieter vergleichen. Beschreiben Sie Ihr Umzugsvolumen genau, um realistische Angebote zu erhalten. Flexible Termine (z.B. unter der Woche) sind oft günstiger.'
    },
    {
      question: 'Sind meine Möbel beim Transport versichert?',
      answer: 'Professionelle Transportdienstleister auf Taskilo haben eine Transportversicherung. Fragen Sie im Voraus nach dem Versicherungsschutz und dokumentieren Sie den Zustand wertvoller Gegenstände vor dem Umzug.'
    },
    {
      question: 'Wie lange dauert ein typischer Umzug?',
      answer: 'Ein 2-Zimmer-Umzug innerhalb der Stadt dauert typischerweise 4-6 Stunden. Bei größeren Wohnungen oder längeren Strecken planen Sie entsprechend mehr Zeit ein. Die Anbieter auf Taskilo geben Ihnen eine realistische Einschätzung.'
    },
    {
      question: 'Kann ich auch nur einzelne Möbelstücke transportieren lassen?',
      answer: 'Ja, auf Taskilo finden Sie auch Anbieter für Einzeltransporte. Ob Waschmaschine, Sofa oder Klavier - beschreiben Sie einfach, was transportiert werden soll, und erhalten Sie passende Angebote.'
    }
  ],
  'IT & Digital': [
    {
      question: 'Was kostet ein Webentwickler pro Stunde?',
      answer: 'Die Stundensätze für Webentwickler liegen zwischen 50-120 Euro je nach Erfahrung und Spezialisierung. Auf Taskilo finden Sie sowohl Freelancer als auch Agenturen für jedes Budget.'
    },
    {
      question: 'Wie lange dauert die Entwicklung einer Website?',
      answer: 'Eine einfache Website ist in 1-2 Wochen realisierbar, komplexe Webprojekte mit individuellen Funktionen benötigen 4-12 Wochen. Besprechen Sie Ihren Zeitplan mit dem Entwickler für eine realistische Planung.'
    },
    {
      question: 'Welche Programmiersprachen werden angeboten?',
      answer: 'Auf Taskilo finden Sie Experten für alle gängigen Technologien: JavaScript, TypeScript, Python, PHP, React, Next.js, Node.js, WordPress und viele mehr. Beschreiben Sie Ihr Projekt und finden Sie den passenden Spezialisten.'
    },
    {
      question: 'Wie finde ich den richtigen IT-Freelancer?',
      answer: 'Achten Sie auf relevante Erfahrung, Portfolio-Projekte und Kundenbewertungen. Ein kurzes Vorgespräch hilft, die Kommunikation und das gegenseitige Verständnis zu prüfen. Taskilo bietet sichere Zahlungsabwicklung über Escrow.'
    },
    {
      question: 'Was ist im IT-Support enthalten?',
      answer: 'IT-Support umfasst je nach Anbieter Problemlösung, Software-Installation, Netzwerkeinrichtung, Datensicherung und mehr. Definieren Sie Ihre Anforderungen klar, um passende Angebote zu erhalten.'
    }
  ],
  'Garten': [
    {
      question: 'Was kostet ein Gärtner pro Stunde?',
      answer: 'Gärtner auf Taskilo berechnen typischerweise 25-45 Euro pro Stunde. Für regelmäßige Gartenpflege sind oft günstigere Pauschalangebote möglich. Holen Sie sich mehrere Angebote zum Vergleich.'
    },
    {
      question: 'Wann ist die beste Zeit für Gartenarbeiten?',
      answer: 'Frühjahr und Herbst sind ideal für größere Gartenarbeiten. Rasenpflege ist von März bis Oktober sinnvoll, Heckenschnitt im Juni und September, Baumpflege im Winter während der Vegetationsruhe.'
    },
    {
      question: 'Welche Gartenarbeiten kann ich buchen?',
      answer: 'Von Rasenmähen über Heckenschnitt, Baumpflege, Unkrautentfernung bis zur kompletten Gartengestaltung und Landschaftsplanung - auf Taskilo finden Sie Experten für alle Gartenarbeiten.'
    },
    {
      question: 'Muss ich Gartengeräte bereitstellen?',
      answer: 'Professionelle Gärtner bringen in der Regel ihre eigenen Geräte mit. Klären Sie dies im Voraus ab, da manche für die Nutzung eigener Maschinen einen kleinen Aufpreis berechnen.'
    },
    {
      question: 'Kann ich auch eine regelmäßige Gartenpflege buchen?',
      answer: 'Ja, viele Gärtner auf Taskilo bieten Abonnements für wöchentliche oder monatliche Gartenpflege an. Das ist oft günstiger als Einzelbuchungen und Ihr Garten sieht immer gepflegt aus.'
    }
  ],
  'Wellness': [
    {
      question: 'Was kostet eine Massage zu Hause?',
      answer: 'Mobile Massagen kosten typischerweise 60-100 Euro pro Stunde, je nach Art der Massage und Qualifikation des Therapeuten. Auf Taskilo finden Sie verschiedene Angebote zum Vergleich.'
    },
    {
      question: 'Welche Wellness-Dienstleistungen gibt es auf Taskilo?',
      answer: 'Von klassischer Massage über Physiotherapie, Personal Training, Yoga-Unterricht bis zu Kosmetikbehandlungen und Friseurservices zu Hause - wir haben Experten für Ihr Wohlbefinden.'
    },
    {
      question: 'Sind die Wellness-Anbieter qualifiziert?',
      answer: 'Alle Wellness-Anbieter auf Taskilo müssen ihre Qualifikationen nachweisen. Achten Sie auf Zertifizierungen und Kundenbewertungen bei der Auswahl.'
    },
    {
      question: 'Kann ich Behandlungen auch vor Ort bekommen?',
      answer: 'Ja, viele Wellness-Anbieter auf Taskilo bieten mobile Services an und kommen direkt zu Ihnen nach Hause oder ins Büro. Perfekt für Entspannung ohne Anfahrtsstress.'
    },
    {
      question: 'Wie lange dauert eine typische Behandlung?',
      answer: 'Eine Massage dauert typischerweise 60-90 Minuten. Bei Erstbehandlungen planen Sie etwas mehr Zeit für die Anamnese ein. Die genaue Dauer wird im Angebot angegeben.'
    }
  ],
  'Hotel & Gastronomie': [
    {
      question: 'Kann ich einen Koch für private Events buchen?',
      answer: 'Ja, auf Taskilo finden Sie private Köche für Dinner-Partys, Familienfeiern oder Business-Events. Die Preise variieren je nach Gästezahl und Menükomplexität.'
    },
    {
      question: 'Was kostet Catering für eine Feier?',
      answer: 'Catering kostet typischerweise 20-60 Euro pro Person, je nach Menüauswahl und Service-Level. Auf Taskilo können Sie verschiedene Caterer vergleichen und das beste Angebot finden.'
    },
    {
      question: 'Bieten Sie auch Personal für Events an?',
      answer: 'Ja, von Servicekräften über Barkeeper bis zu Event-Managern - auf Taskilo finden Sie qualifiziertes Personal für jede Veranstaltung.'
    },
    {
      question: 'Wie früh sollte ich für eine Veranstaltung buchen?',
      answer: 'Für größere Events empfehlen wir eine Buchung 4-6 Wochen im Voraus. Für kleine private Feiern reichen oft 1-2 Wochen. Je früher, desto mehr Auswahl haben Sie.'
    },
    {
      question: 'Werden spezielle Ernährungsbedürfnisse berücksichtigt?',
      answer: 'Ja, die meisten Caterer und Köche auf Taskilo können vegetarische, vegane, glutenfreie und andere spezielle Menüs anbieten. Kommunizieren Sie Ihre Wünsche bei der Anfrage.'
    }
  ],
  'Marketing & Vertrieb': [
    {
      question: 'Was kostet ein Marketing-Freelancer?',
      answer: 'Marketing-Experten auf Taskilo berechnen je nach Spezialisierung 40-100 Euro pro Stunde. Für längere Projekte sind oft Pauschalpreise oder monatliche Retainer möglich.'
    },
    {
      question: 'Welche Marketing-Dienstleistungen gibt es?',
      answer: 'Von Social Media Management über SEO, Content Marketing, Google Ads, E-Mail-Marketing bis zur Markenentwicklung und Vertriebsstrategien - auf Taskilo finden Sie Experten für alle Marketing-Bereiche.'
    },
    {
      question: 'Wie finde ich den richtigen Marketing-Experten?',
      answer: 'Achten Sie auf Branchenerfahrung, nachweisbare Erfolge und Kundenbewertungen. Ein kurzes Kennenlerngespräch hilft, die Zusammenarbeit einzuschätzen. Auf Taskilo können Sie mehrere Angebote vergleichen.'
    },
    {
      question: 'Wie lange dauert es, bis Marketing-Maßnahmen wirken?',
      answer: 'SEO zeigt typischerweise nach 3-6 Monaten Ergebnisse, bezahlte Werbung wirkt sofort. Ihr Marketing-Experte auf Taskilo kann Ihnen eine realistische Einschätzung für Ihre Ziele geben.'
    },
    {
      question: 'Kann ich auch kurzfristige Marketing-Projekte buchen?',
      answer: 'Ja, auf Taskilo finden Sie Experten für einmalige Projekte wie Kampagnenentwicklung, Website-Texte oder Social Media Aufbau. Beschreiben Sie Ihr Projekt und erhalten Sie passende Angebote.'
    }
  ],
  'Finanzen & Recht': [
    {
      question: 'Was kostet eine Steuerberatung?',
      answer: 'Steuerberater auf Taskilo berechnen je nach Komplexität 80-150 Euro pro Stunde. Für Jahresabschlüsse und laufende Buchhaltung sind oft Pauschalpreise günstiger.'
    },
    {
      question: 'Welche Finanzdienstleistungen gibt es auf Taskilo?',
      answer: 'Von Buchhaltung über Steuerberatung, Finanzplanung, Unternehmensberatung bis zu Rechtsberatung und Vertragsgestaltung - wir vermitteln qualifizierte Experten für alle Finanzbereiche.'
    },
    {
      question: 'Wie finde ich einen guten Steuerberater?',
      answer: 'Achten Sie auf Branchenerfahrung, Qualifikationen und Kundenbewertungen. Ein Erstgespräch hilft, die Chemie zu prüfen. Auf Taskilo können Sie transparent Angebote vergleichen.'
    },
    {
      question: 'Sind die Berater auf Taskilo qualifiziert?',
      answer: 'Ja, alle Finanz- und Rechtsberater auf Taskilo müssen ihre Qualifikationen und Zulassungen nachweisen. Sie finden nur geprüfte Experten auf unserer Plattform.'
    },
    {
      question: 'Kann ich auch einmalige Beratungen buchen?',
      answer: 'Ja, viele Berater bieten Einzelstunden für konkrete Fragen an. Ideal für eine Steuerfrage, Vertragsprüfung oder Finanzplanung ohne langfristige Bindung.'
    }
  ],
  'Bildung & Unterstützung': [
    {
      question: 'Was kostet Nachhilfe pro Stunde?',
      answer: 'Nachhilfe auf Taskilo kostet typischerweise 20-40 Euro pro Stunde, je nach Fach und Qualifikation des Lehrers. Für regelmäßige Nachhilfe sind oft günstigere Pakete verfügbar.'
    },
    {
      question: 'Welche Fächer werden angeboten?',
      answer: 'Von Mathematik, Deutsch, Englisch über Naturwissenschaften bis zu Musikunterricht und Sprachen - auf Taskilo finden Sie Nachhilfelehrer und Tutoren für alle Fächer und Altersgruppen.'
    },
    {
      question: 'Bieten Sie auch Online-Nachhilfe an?',
      answer: 'Ja, viele Lehrer auf Taskilo bieten Online-Unterricht per Video-Call an. Flexibel, ortsunabhängig und oft günstiger als Präsenzunterricht.'
    },
    {
      question: 'Wie finde ich den richtigen Nachhilfelehrer?',
      answer: 'Achten Sie auf Qualifikationen, Erfahrung mit der Altersgruppe und Kundenbewertungen. Ein Probetermin hilft, die Chemie zwischen Lehrer und Schüler zu testen.'
    },
    {
      question: 'Gibt es auch Unterstützung für Erwachsene?',
      answer: 'Ja, auf Taskilo finden Sie auch Coaches, Tutoren und Trainer für Erwachsenenbildung, berufliche Weiterbildung und persönliche Entwicklung.'
    }
  ],
  'Tiere & Pflanzen': [
    {
      question: 'Was kostet ein Hundesitter pro Tag?',
      answer: 'Hundesitting kostet auf Taskilo typischerweise 15-30 Euro pro Tag für Tagesbetreuung, Übernachtungen 25-50 Euro. Die Preise variieren je nach Größe des Hundes und Betreuungsumfang.'
    },
    {
      question: 'Welche Tierservices gibt es auf Taskilo?',
      answer: 'Von Hundesitting, Gassi-Service, Katzenpflege über Tiertransport bis zu Tiertraining und Pflanzenpflege während des Urlaubs - wir haben Experten für Ihre tierischen und pflanzlichen Lieblinge.'
    },
    {
      question: 'Sind die Tierbetreuer erfahren?',
      answer: 'Alle Tierbetreuer auf Taskilo haben Erfahrung im Umgang mit Tieren. Viele haben zusätzliche Qualifikationen. Lesen Sie die Bewertungen anderer Tierbesitzer für die beste Auswahl.'
    },
    {
      question: 'Kann ich auch kurzfristig einen Tiersitter buchen?',
      answer: 'Ja, auf Taskilo gibt es Tiersitter, die auch kurzfristig verfügbar sind. Für Ferienzeiten empfehlen wir jedoch eine frühzeitige Buchung, da die Nachfrage hoch ist.'
    },
    {
      question: 'Werden meine Pflanzen auch während des Urlaubs gepflegt?',
      answer: 'Ja, auf Taskilo finden Sie Pflanzenpfleger, die Ihre Zimmerpflanzen und Gartenpflanzen während Ihrer Abwesenheit gießen und pflegen.'
    }
  ],
  'Kreativ & Kunst': [
    {
      question: 'Was kostet ein Fotograf pro Stunde?',
      answer: 'Fotografen auf Taskilo berechnen je nach Erfahrung und Spezialisierung 80-200 Euro pro Stunde. Für Events wie Hochzeiten sind Pauschalangebote üblich.'
    },
    {
      question: 'Welche kreativen Dienstleistungen gibt es?',
      answer: 'Von Fotografie, Videoproduktion, Grafikdesign über Illustration, Musik und Texterstellung bis zu Kunstunterricht - auf Taskilo finden Sie kreative Talente für jedes Projekt.'
    },
    {
      question: 'Wie finde ich den richtigen Kreativen?',
      answer: 'Achten Sie auf das Portfolio, den Stil und Kundenbewertungen. Ein Briefing-Gespräch hilft, Ihre Vision zu kommunizieren. Auf Taskilo können Sie mehrere Kreative vergleichen.'
    },
    {
      question: 'Sind die Nutzungsrechte im Preis enthalten?',
      answer: 'Das hängt vom Angebot ab. Klären Sie die Nutzungsrechte im Voraus - für kommerzielle Nutzung können zusätzliche Kosten anfallen. Die Anbieter auf Taskilo kommunizieren dies transparent.'
    },
    {
      question: 'Wie lange dauert ein typisches Kreativprojekt?',
      answer: 'Das variiert stark: Ein Logo kann in 1-2 Wochen fertig sein, eine Website-Gestaltung dauert 3-6 Wochen, Videos je nach Länge und Komplexität 1-4 Wochen.'
    }
  ],
  'Event & Veranstaltung': [
    {
      question: 'Was kostet ein Event-Planer?',
      answer: 'Event-Planer auf Taskilo berechnen je nach Veranstaltungsgröße 500-3000 Euro oder prozentual vom Event-Budget. Für kleinere Feiern sind Stundensätze von 50-80 Euro üblich.'
    },
    {
      question: 'Welche Event-Services gibt es?',
      answer: 'Von Event-Planung, DJ-Services, Fotografen, Catering bis zu Dekorateuren, Moderatoren und Technikern - auf Taskilo finden Sie alle Dienstleister für Ihre perfekte Veranstaltung.'
    },
    {
      question: 'Wie früh sollte ich ein Event buchen?',
      answer: 'Für große Events wie Hochzeiten empfehlen wir 6-12 Monate Vorlauf. Für Firmenfeiern oder Geburtstage reichen meist 4-8 Wochen. Je früher, desto mehr Auswahl.'
    },
    {
      question: 'Kann ich auch einzelne Services buchen?',
      answer: 'Ja, Sie können auf Taskilo einzelne Dienstleister wie DJ, Fotograf oder Caterer direkt buchen, ohne einen kompletten Event-Planer zu engagieren.'
    },
    {
      question: 'Was passiert bei Problemen am Event-Tag?',
      answer: 'Professionelle Event-Dienstleister auf Taskilo haben Notfallpläne. Unser Bewertungssystem hilft Ihnen, zuverlässige Anbieter zu finden. Bei Problemen steht Ihnen unser Support zur Seite.'
    }
  ],
  'Büro & Administration': [
    {
      question: 'Was kostet eine virtuelle Assistenz?',
      answer: 'Virtuelle Assistenten auf Taskilo berechnen typischerweise 20-45 Euro pro Stunde. Für regelmäßige Unterstützung sind oft günstigere Stundenpakete oder Retainer möglich.'
    },
    {
      question: 'Welche Büroservices gibt es auf Taskilo?',
      answer: 'Von virtueller Assistenz, Buchhaltung, Dateneingabe über Übersetzungen, Transkription bis zu Recherche und Kundensupport - wir haben Experten für alle administrativen Aufgaben.'
    },
    {
      question: 'Wie arbeite ich mit einer virtuellen Assistenz zusammen?',
      answer: 'Die Zusammenarbeit erfolgt digital über E-Mail, Projektmanagement-Tools und Video-Calls. Definieren Sie klare Aufgaben und Erwartungen für eine erfolgreiche Zusammenarbeit.'
    },
    {
      question: 'Sind die Daten bei virtuellen Assistenten sicher?',
      answer: 'Ja, professionelle virtuelle Assistenten auf Taskilo arbeiten diskret und unterzeichnen bei Bedarf Vertraulichkeitsvereinbarungen. Achten Sie auf die Bewertungen zur Zuverlässigkeit.'
    },
    {
      question: 'Kann ich auch projektbezogen buchen?',
      answer: 'Ja, auf Taskilo können Sie sowohl einmalige Projekte wie Datenmigration oder Recherche als auch laufende Unterstützung buchen. Flexibilität ist unser Vorteil.'
    }
  ]
};

// Fallback FAQs für Kategorien ohne spezifische FAQs
export const defaultFaqs: FAQ[] = [
  {
    question: 'Wie finde ich den richtigen Dienstleister auf Taskilo?',
    answer: 'Nutzen Sie unsere Suchfunktion und Filter, um passende Anbieter zu finden. Achten Sie auf Kundenbewertungen, abgeschlossene Projekte und Reaktionszeit. Holen Sie sich mehrere Angebote zum Vergleich.'
  },
  {
    question: 'Wie läuft die Zahlung auf Taskilo ab?',
    answer: 'Taskilo nutzt ein sicheres Escrow-System: Ihre Zahlung wird treuhänderisch verwaltet und erst nach erfolgreicher Fertigstellung an den Dienstleister ausgezahlt. Das schützt Sie bei jedem Auftrag.'
  },
  {
    question: 'Was kostet die Nutzung von Taskilo?',
    answer: 'Für Auftraggeber ist Taskilo kostenlos. Sie zahlen nur den vereinbarten Preis für die Dienstleistung. Keine versteckten Gebühren, keine Abos.'
  },
  {
    question: 'Wie schnell erhalte ich Angebote?',
    answer: 'Die meisten Dienstleister auf Taskilo antworten innerhalb von 24 Stunden. Für dringende Anfragen können Sie nach Anbietern mit schneller Reaktionszeit filtern.'
  },
  {
    question: 'Was passiert bei Problemen mit einem Auftrag?',
    answer: 'Unser Support-Team steht Ihnen bei Fragen oder Problemen zur Seite. Dank Escrow-Schutz ist Ihre Zahlung sicher. Wir helfen bei der Vermittlung und Lösung von Konflikten.'
  }
];

// Funktion zum Abrufen der FAQs für eine Kategorie
export function getFaqsForCategory(categoryTitle: string): FAQ[] {
  return categoryFaqs[categoryTitle] || defaultFaqs;
}
