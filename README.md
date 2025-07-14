# Taskilo - Service Platform

Taskilo ist eine moderne Plattform, die Kunden mit verifizierten Dienstleistern verbindet. Von Handwerk bis Haushaltsservice - finden Sie den perfekten Anbieter für Ihr Projekt.

## 🧹 Projekt-Wartung

**Für Entwickler:** Nutzen Sie unsere [Cleanup-Tools](docs/guides/CLEANUP_README.md) um ungenutzte Dateien und Komponenten zu identifizieren und sicher zu entfernen.

## Features

- 🔍 **Service-Suche**: Finden Sie qualifizierte Dienstleister in Ihrer Nähe
- ✅ **Verifizierte Anbieter**: Alle Dienstleister sind geprüft und bewertet
- 💳 **Sichere Bezahlung**: Integrierte Stripe-Zahlungsabwicklung
- 📱 **Responsive Design**: Optimiert für Desktop und Mobile
- 🔔 **Echtzeit-Benachrichtigungen**: Bleiben Sie über Buchungen informiert

## Technologie Stack

- **Frontend**: Next.js 14 mit TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Firebase (Firestore, Authentication, Functions)
- **Payments**: Stripe
- **Deployment**: Vercel

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Projektstruktur

```
src/
├── app/                # Next.js App Router
├── components/         # React Komponenten
├── lib/               # Utility-Funktionen
├── hooks/             # Custom React Hooks
└── types/             # TypeScript Definitionen
```

## Deployment

Die Anwendung wird automatisch auf Vercel deployed. Jeder Push auf den main Branch löst ein neues Deployment aus.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
