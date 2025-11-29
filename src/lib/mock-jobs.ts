export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  date: string;
  logoUrl: string;
  description: string;
  isNew?: boolean;
  isExpress?: boolean;
  industry?: string;
  jobGroup?: string;
  externalLink?: string;
}

export const MOCK_JOBS: Job[] = [
  {
    id: '3877121',
    title: 'Chef de Partie (m/w/d)',
    company: 'Hotel Adlon Kempinski Berlin',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '28.11.2025',
    logoUrl: 'https://logo.clearbit.com/kempinski.com',
    description: 'Werden Sie Teil der Legende. Das Hotel Adlon Kempinski Berlin sucht Sie als Chef de Partie (m/w/d).',
    isNew: true,
    industry: 'Hotellerie',
    jobGroup: 'Küche',
    externalLink: 'https://www.hotelcareer.de/jobs/hotel-adlon-kempinski-berlin-1094/chef-de-partie-3877121'
  },
  {
    id: '3632135',
    title: 'Souschef (m/w/d) international cooks welcome!',
    company: 'SO/ Berlin Das Stue',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '28.11.2025',
    logoUrl: 'https://logo.clearbit.com/so-berlin-das-stue.com', // Placeholder or generic
    description: 'Kochen nach den Vorgaben des Küchenchefs / cooking after the guidelines of the <strong>chef</strong> * Planung und Erstellen von neuen Kreationen / plan & create new dishes with the <strong>chef</strong> Das Küchenteam des SO/ Berlin Das Stue, mit seinem vielfältigen und spannenden kulinarischen Angebot, sucht Verstärkung.',
    isNew: true,
    industry: 'Hotellerie',
    jobGroup: 'Küche'
  },
  {
    id: '3888372',
    title: 'Souschef - Leitende Fachkraft Küche (m/w/d)',
    company: 'presented by StepStone',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '29.11.2025',
    logoUrl: 'https://logo.clearbit.com/stepstone.de',
    description: '<strong>Souschef</strong>*in - Leitende Fachkraft Küche (m/w/d) Blumenfisch bietet Arbeitsplätze für Menschen mit Beeinträchtigungen und fördert den Ein- oder Wiedereinstieg in das Berufsleben an fünf Berliner Standorten.',
    industry: 'Soziale Einrichtungen',
    jobGroup: 'Küche'
  },
  {
    id: '3903191',
    title: 'Küchenleitung (m/w/d)',
    company: 'presented by StepStone',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '29.11.2025',
    logoUrl: 'https://logo.clearbit.com/stepstone.de',
    description: 'Arbeitgeber: Albert Schweitzer Stiftung - Wohnen & Betreuen - Einsatzort: 10178 Berlin - Die Albert Schweitzer Stiftung - Wohnen & Betreuen ist einer der vielfältigsten Träger Berlins.',
    industry: 'Soziale Einrichtungen',
    jobGroup: 'Küche'
  },
  {
    id: '3760193',
    title: 'Küchenleitung (m/w/d) - Berlin-Steglitz',
    company: 'Domicil - Seniorenpflegeheim Bergstraße GmbH',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '28.11.2025',
    logoUrl: 'https://logo.clearbit.com/domicil-seniorenresidenzen.de',
    description: 'Offen. Herzlich. Gemeinsam. Gutes Essen ist ein Stück Lebensqualität. Genau dafür sorgen wir an unseren 49 Standorten. Koche mit Liebe und Verantwortung für unsere Bewohnerinnen und Bewohner und komm in unser Team als Küchenleitung (m/w/d) * Zuschüsse bis max. 50€ für ÖPNV, Tanken oder EGYM Wellpass * JobRad * Steuerfreie Zuschüsse für Kinderbetreuung und Altersvorsorge',
    industry: 'Kliniken / Praxen / Seniorenheime',
    jobGroup: 'Küche'
  },
  {
    id: '3895858',
    title: 'Souschef (m/w/d) für die Bankettabteilung',
    company: 'EUREF-Event GmbH',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '28.11.2025',
    logoUrl: 'https://logo.clearbit.com/euref.de',
    description: 'Wir suchen DICH als <strong>Souschef</strong> ( m/w/d) für die Bankettabteilung - EUREF-CAMPUS BERLIN – EIN ZUKUNFTSORT - Du willst das Besondere? Gestalte mit uns #EVENTSOFTHEFUTURE - Der EUREF- Campus Berlin, der Vorzeigeort der gelebten Energiewende, wird ab Juni 2024 um eine Attraktion reicher.',
    isExpress: true,
    industry: 'Catering Event / Partyservice',
    jobGroup: 'Küche'
  },
  {
    id: '3917859',
    title: 'Stellv. Küchenleitung (m/w/d) - Berlin - Steglitz',
    company: 'Domicil - Seniorenpflegeheim Bergstraße GmbH',
    location: 'Berlin',
    type: 'Vollzeit, Teilzeit',
    date: '28.11.2025',
    logoUrl: 'https://logo.clearbit.com/domicil-seniorenresidenzen.de',
    description: 'Vertretung des <strong>Küchenleiters</strong> in seiner Abwesenheit - Offen. Herzlich. Gemeinsam. Gutes Essen ist ein Stück Lebensqualität. Genau dafür sorgen wir an unseren 49 Standorten. Koche mit Liebe und Verantwortung für unsere Bewohnerinnen und Bewohner und komm in unser Team als Stellv. Küchenleitung (m/w/d) * Zuschüsse bis max. 50€ für ÖPNV, Tanken oder EGYM Wellpass * JobRad',
    industry: 'Kliniken / Praxen / Seniorenheime',
    jobGroup: 'Küche'
  },
  {
    id: '3921128',
    title: 'Sous Chef (m/w/d) – Kreative Kulinarik & Teamspirit gesucht!',
    company: 'Flavour Union Service GmbH',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '28.11.2025',
    logoUrl: 'https://ui-avatars.com/api/?name=Flavour+Union&background=random',
    description: 'Koordination und Umsetzung aller operativen Aufgaben bei Events und Caterings * Mitverantwortung für Kalkulation und Wirtschaftlichkeit unserer Menüs & Food-Kreationen * Aktive Mitarbeit im Tagesgeschäft und Hands-on-Mentalität bei Events * Leitung und Motivation des Küchenteams inkl. Planung, Organisation & Qualitätssicherung',
    industry: 'Catering Event / Partyservice',
    jobGroup: 'Küche'
  },
  {
    id: '3156160',
    title: 'Executive Souschef (m/w/d)',
    company: 'Hofbräu Berlin',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '27.11.2025',
    logoUrl: 'https://logo.clearbit.com/hofbraeu-wirtshaus.de',
    description: 'Wir suchen ab sofort einen engagierten <strong>Executive Souschef</strong> (m/w/d) in Vollzeit! Deine Aufgaben * Abgeschlossene Berufsausbildung als Koch * Mehrjährige Berufserfahrung in vergleichbaren Positionen * Leidenschat für den Beruf, die Sie an Ihr Team weitergeben * Umsetzung und stetige Weiterentwicklung von Rezepten * Wirtschaftliches Denken und Handeln',
    industry: 'Gastronomie',
    jobGroup: 'Küche'
  },
  {
    id: '3826104',
    title: 'Souschef (m/w/d)',
    company: 'AMANO GROUP',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '26.11.2025',
    logoUrl: 'https://logo.clearbit.com/amanogroup.de',
    description: 'Erfahrung als <strong>Souschef</strong> oder langjährige Erfahrung als <strong>Chef</strong> de Partie - Join our Team als <strong>Souschef</strong> (m/w/d). Bei der AMANO Group starten und eine vollkommene Neuinterpretation von Hotellerie erleben. * Unterstützung bei der Koordination und Organisation des gesamten Küchenablaufs * Die Zubereitung von Speisen im Bankett, À-la-carte, Frühstück und Buffetbereich',
    industry: 'Hotellerie',
    jobGroup: 'Küche'
  },
  {
    id: '3902818',
    title: 'Chefkoch (m/w/d)',
    company: 'AMANO GROUP',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '26.11.2025',
    logoUrl: 'https://logo.clearbit.com/amanogroup.de',
    description: 'Join our Team als <strong>Chefkoch</strong> (m/w/d) Bei der AMANO Group starten und eine vollkommene Neuinterpretation von Hotellerie erleben. * Gesamtverantwortung für die Küchenorganisation und den reibungslosen Ablauf * Führung, Motivation und Schulung des Küchenteams * Dienstplangestaltung & Urlaubspalnung * Planung, Kalkulation und Umsetzung kreativer Speisenangebote',
    industry: 'Hotellerie',
    jobGroup: 'Küche'
  },
  {
    id: '3916946',
    title: 'Souschef (m/w/d)',
    company: 'AMANO Grand Central',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '25.11.2025',
    logoUrl: 'https://logo.clearbit.com/amanogroup.de',
    description: 'Erfahrung als <strong>Souschef</strong> oder langjährige Erfahrung als <strong>Chef</strong> de Partie - Wir suchen SIE! Die AMANO Group ist ein Berliner Hotelunternehmen, das 2009 gegründet wurde.',
    industry: 'Hotellerie',
    jobGroup: 'Küche'
  },
  {
    id: '3917557',
    title: 'Souschef (m/w/d)',
    company: 'TITANIC GENDARMENMARKT BERLIN',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '25.11.2025',
    logoUrl: 'https://logo.clearbit.com/titanic-hotels.com',
    description: 'Wir leben Hotellerie mit Leidenschaft und Begeisterung. Als Wohlfühlexplorer schaffst Du mit uns einen Ort der Leichtigkeit und Entspannung – und sorgst dafür, dass unsere Gäste sich rundum wohlfühlen. Dein Profil * Sehr gute Deutschkenntnisse (mindestens C1) und Englischkenntnisse (mindestens B2) – weitere Sprachen? Mega!',
    industry: 'Hotellerie',
    jobGroup: 'Küche'
  },
  {
    id: '3905603',
    title: 'Junior Head Chef (m/w/d)',
    company: 'TITANIC GENDARMENMARKT BERLIN',
    location: 'Berlin',
    type: 'Zeit- / Saisonvertrag',
    date: '25.11.2025',
    logoUrl: 'https://logo.clearbit.com/titanic-hotels.com',
    description: 'Operative Steuerung der Sous <strong>Chefs,</strong> <strong>Chef</strong> de Partie und Frühstücksleitung. Fachliche Anleitung der Sous <strong>Chefs,</strong> <strong>Chef</strong> de Partie, Frühstücksköche und Küchenhelfer. Wir leben Hotellerie mit Leidenschaft und Begeisterung. Als Wohlfühlexplorer schaffst Du mit uns einen Ort der Leichtigkeit und Entspannung – und sorgst dafür, dass unsere Gäste sich rundum wohlfühlen.',
    industry: 'Hotellerie',
    jobGroup: 'Küche'
  },
  {
    id: '3919954',
    title: 'Küchenchef (m/w/d)',
    company: 'Sheraton Berlin Grand Hotel Esplanade',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '24.11.2025',
    logoUrl: 'https://logo.clearbit.com/marriott.com',
    description: 'Kochkunst neu gedacht – dein Neustart als <strong>Küchenchef</strong> (m/w/d) im Sheraton Berlin Grand Hotel Esplanade! Du brennst für kreative Küche, liebst es, Teams zu inspirieren und Gäste mit besonderen kulinarischen Momenten zu begeistern? Gestalte mit uns ein neues kulinarisches Kapitel.',
    industry: 'Hotellerie',
    jobGroup: 'Küche'
  },
  {
    id: '3919913',
    title: 'Souschef (m/w/d)',
    company: 'Berlin Capital Club',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '24.11.2025',
    logoUrl: 'https://ui-avatars.com/api/?name=Berlin+Capital+Club&background=random',
    description: 'Unser exklusiver Club im Herzen von Berlin sucht ab sofort eine motivierte Persönlichkeit mit Leidenschaft als <strong>Souschef</strong> zur Weiterentwicklung unserer Clubküche. Willkommen im Berlin Capital Club, dem führenden Business-Club Deutschlands! Der Berlin Capital Club wurde 2001 gegründet und ist somit der erste private Businessclub Berlins.',
    industry: 'Gastronomie',
    jobGroup: 'Küche'
  },
  {
    id: '3919882',
    title: 'Souschef (m/w/d) mit Eintritt zum 01.03.2026; gern auch aus dem Nicht-EU-Ausland',
    company: 'Classik Hotel Alexander Plaza',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '24.11.2025',
    logoUrl: 'https://logo.clearbit.com/classik-hotel-collection.com',
    description: 'Dann bewirb Dich hier als <strong>Souschef</strong> (m/w/d). Du bist auf der Suche nach einem Arbeitsplatz mit Entwicklungsmöglichkeiten? Unser Classik Hotel Alexander Plaza sucht Verstärkung für unser Küchenteam! Wir schätzen kulinarische Vielfalt und möchten unsere Speisekarte mit authentischen internationalen Einflüssen bereichern.',
    industry: 'Hotellerie',
    jobGroup: 'Küche'
  },
  {
    id: '3854704',
    title: 'Junior Souschef (m/w/d) im Event und Catering Bereich',
    company: 'Grand Hyatt Berlin',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '21.11.2025',
    logoUrl: 'https://logo.clearbit.com/hyatt.com',
    description: 'Du hast bereits Erfahrung als <strong>Chef</strong> de Partie / <strong>Junior Sous Chef</strong> gesammelt und bist bereit für den nächsten Schritt - Werde auch Du Teil unseres großartigen Teams und begeistere unsere Gäste sowie auch Kollegen als <strong>Junior Souschef</strong> (m/w/d) im Events & Catering Bereich!',
    industry: 'Hotellerie',
    jobGroup: 'Küche'
  },
  {
    id: '3907038',
    title: 'Junior Souschef (m/w/d) im Vox Restaurant',
    company: 'Grand Hyatt Berlin',
    location: 'Berlin',
    type: 'Vollzeit, Teilzeit',
    date: '21.11.2025',
    logoUrl: 'https://logo.clearbit.com/hyatt.com',
    description: 'bereits Erfahrung als <strong>Jr Sous Chef,</strong> <strong>Chef</strong> de Partie im á la carte Dinner - Werde auch Du Teil unseres großartigen Teams und begeistere unsere Gäste wie auch Kollegen als <strong>Junior Souschef</strong> (m/w/d) in Vollzeit/Teilzeit.',
    industry: 'Hotellerie',
    jobGroup: 'Küche'
  },
  {
    id: '3908696',
    title: 'Souschef (m/w/d) im Event & Catering Bereich',
    company: 'Grand Hyatt Berlin',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '21.11.2025',
    logoUrl: 'https://logo.clearbit.com/hyatt.com',
    description: 'Du hast bereits Erfahrung als <strong>Chef</strong> de Partie / Junior <strong>Sous Chef</strong> gesammelt und bist bereit für den nächsten Schritt - Werde auch Du Teil unseres großartigen Teams und begeistere unsere Gäste sowie auch Kollegen als <strong>Souschef</strong> (m/w/d) im Events & Catering Bereich! GRAND Benefits - because we care for you!',
    industry: 'Hotellerie',
    jobGroup: 'Küche'
  },
  {
    id: '3915196',
    title: 'Souchef (m/w/d)',
    company: 'The Blue Pearl',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '10.11.2025',
    logoUrl: 'https://ui-avatars.com/api/?name=The+Blue+Pearl&background=random',
    description: 'Karriere bei The Blue Pearl - Das neue Fine Dining & Erlebnisrestaurant im historischen Nikolaiviertel - In Berlins historischer Mitte eröffnet ein Restaurant, das mehr ist als ein Ort für Kulinarik – THE BLUE PEARL ist eine Erlebniswelt, wo Haute Cuisine, multisensorisches Storytelling und künstlerisches Design aufeinander treffen.',
    industry: 'Restaurants',
    jobGroup: 'Küche'
  },
  {
    id: '3915211',
    title: 'Chef de Cuisine (m/w/d)',
    company: 'The Blue Pearl',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '10.11.2025',
    logoUrl: 'https://ui-avatars.com/api/?name=The+Blue+Pearl&background=random',
    description: 'In Berlins historischer Mitte eröffnet ein Restaurant, das mehr ist als ein Ort für Kulinarik – THE BLUE PEARL ist eine Erlebniswelt, wo Haute <strong>Cuisine,</strong> multisensorisches Storytelling und künstlerisches Design aufeinander treffen. Karriere bei The Blue Pearl - Das neue Fine Dining & Erlebnisrestaurant im historischen Nikolaiviertel',
    industry: 'Restaurants',
    jobGroup: 'Küche'
  },
  {
    id: '3912751',
    title: 'Küchenchef (m/w/d)',
    company: 'Venue Cafe',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '07.11.2025',
    logoUrl: 'https://ui-avatars.com/api/?name=Venue+Cafe&background=random',
    description: '<strong>Küchenchef</strong> - Küchendirektor - Jobbeschreibung: Eine Postion mit Perspektive und Wachstumschancen. Wir betreiben auktuell das Frühstücksrestaurant Venue in Berlin Neukölln und haben im vergangenem Jahr einen zweiten Standort in Steglitz eröffnet. Unser Schwerpunkt liegt in der Zusammenarbeit lokaler und hochwertiger Produzent sowie einer Saisonalen Karte.',
    industry: 'Bars / Bäckerei / Café / Bistro',
    jobGroup: 'Küche'
  },
  {
    id: '3913559',
    title: 'Stellvertretender Küchenleiter (m/w/d) Kantinenleitung',
    company: 'Löwenzahn Dienstleistungs GmbH',
    location: 'Berlin',
    type: 'Vollzeit',
    date: '05.11.2025',
    logoUrl: 'https://logo.clearbit.com/klax-online.de',
    description: 'Die Löwenzahn Dienstleistungs GmbH ist ein Unternehmen der Klax Unternehmensgruppe. Die Klax Unternehmensgruppe ist ein erfolgreich expandierender Bildungsträger, deren Mitglieder sich für die individuelle Entwicklung, die umfassende Bildung von Menschen sowie deren Umweltbewusstsein engagieren.',
    industry: 'Catering / Großverpflegung',
    jobGroup: 'Küche'
  },
  {
    id: '3920856',
    title: 'Koch / Betriebsleiter (m/w/d)',
    company: 'BONVITA 360° HOSPITALITY GmbH',
    location: 'Offenburg, Oberhausen, Ludwigsfelde...',
    type: 'Vollzeit',
    date: '26.11.2025',
    logoUrl: 'https://logo.clearbit.com/bonvita.eu',
    description: 'Du fehlst uns als <strong>Koch</strong> / <strong>Betriebsleiter</strong> (m/w/d) mit Unternehmergeist. * Du bist ausgebildete/r <strong>Köchin</strong> /<strong>Koch</strong> und hast optimalerweise Erfahrung in der Gemeinschaftsverpflegung. Werde dein eigener <strong>Chef</strong> in der BONVITA Familie mit geregelten Arbeitszeiten und freien Wochenenden. Die Freiheit eines Unternehmers mit der Sicherheit eines Angestellten! Deine Aufgaben'
  }
];
