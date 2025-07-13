'use client';

import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import { FiX, FiInfo, FiCheck } from 'react-icons/fi';
import { useState } from 'react';
import { useRegistration } from '@/contexts/Registration-Context'; // Korrigierter Pfad zum Context

const steps = [
  "Über Sie",
  "Identitätsnachweis",
  "Qualifikationen",
  "Profil anlegen",
  "Bezahlmethode"
];

export default function Step1() {
  const {
    setFirstName,
    setLastName,
    setEmail,
    setPassword,
    setDateOfBirth,
    setPhoneNumber,
    setIsManagingDirectorOwner, // Korrigierter Name der Setter-Funktion
  } = useRegistration(); // Verwendung des Hooks für den Context

  // Lokale Zustände für die Formularfelder
  const [localFirstName, setLocalFirstName] = useState('');
  const [localLastName, setLocalLastName] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localPassword, setLocalPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localDateOfBirth, setLocalDateOfBirth] = useState('');
  const [localPhoneCountryCode, setLocalPhoneCountryCode] = useState('+49');
  const [localPhoneNumber, setLocalPhoneNumber] = useState('');
  const [localIsSoleOwner, setLocalIsSoleOwner] = useState(false); // Initial auf false setzen
  const [agreeTerms, setAgreeTerms] = useState(false); // Initial auf false setzen
  const [isModalOpen, setIsModalOpen] = useState(false); // Zustand für das Modal

  const router = useRouter(); // Next.js Router für Navigation


  // Funktion zum Behandeln des "Weiter"-Klicks
  const handleNext = () => {
    if (localPassword !== confirmPassword) {
      alert('Passwörter stimmen nicht überein!'); // Einfacher Alert für Feedback
      return;
    }

    // Aktualisiere den globalen Context mit den lokalen Zuständen
    setFirstName(localFirstName);
    setLastName(localLastName);
    setEmail(localEmail);
    setPassword(localPassword);
    setDateOfBirth(localDateOfBirth);
    setPhoneNumber(localPhoneCountryCode + ' ' + localPhoneNumber);
    setIsManagingDirectorOwner(localIsSoleOwner); // Aufruf mit dem korrigierten Setter

    // Navigiere zum nächsten Schritt
    router.push('/register/company/step2');
  };

  // Validierungslogik für das Formular
  const isFormValid = () => {
    return localFirstName.trim() !== '' &&
      localLastName.trim() !== '' &&
      localEmail.trim() !== '' &&
      localPassword.trim() !== '' &&
      confirmPassword.trim() !== '' &&
      localDateOfBirth.trim() !== '' &&
      localPhoneNumber.trim() !== '' &&
      agreeTerms &&
      localIsSoleOwner;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br p-4 sm:p-6 font-sans">
      {/* Top-Bereich: Abbrechen-Button, Fortschrittsbalken, Schritt-Header */}
      <div className="w-full max-w-xl lg:max-w-4xl mx-auto mb-6 px-4"> {/* Max-Breite angepasst */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => router.push('/')} // Navigiert zur Startseite bei Abbruch
            className="text-[#14ad9f] hover:text-teal-700 text-base sm:text-lg flex items-center transition-colors duration-200"
          >
            <span className="mr-2">Abbrechen</span>
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Fortschrittsbalken */}
        <div className="mb-6">
          <ProgressBar currentStep={1} totalSteps={5} />
        </div>

        {/* Schritt-Header */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-lg sm:text-xl text-teal-600 font-semibold">Schritt 1/5</p>
          <div className="flex items-center">
            <button
              onClick={() => setIsModalOpen(true)} // Öffnet das Modal
              className="text-sm sm:text-base text-teal-600 hover:underline mr-2 cursor-pointer"
            >
              Schritte anzeigen
            </button>
            <FiInfo className="text-teal-600 text-xl sm:text-2xl" />
          </div>
        </div>
      </div>

      {/* Formular-Container */}
      <div className="max-w-2xl w-full bg-white p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200"> {/* Verbesserter Schatten und Rundung */}
        <h2 className="text-2xl sm:text-3xl font-bold text-teal-600 mb-6 text-center">Registrierung als Tasker</h2> {/* Neuer Titel */}
        <p className="text-gray-600 text-center mb-8">Erzählen Sie uns etwas über sich.</p> {/* Zusätzlicher Untertitel */}

        <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
          {/* Formularfelder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Responsives Grid für Felder */}
            {/* Vorname */}
            <div className="mb-4 md:mb-0"> {/* mb-0 auf md: um Abstand in Spalten zu steuern */}
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="firstName">Vorname</label>
              <input
                type="text"
                id="firstName"
                value={localFirstName}
                onChange={(e) => setLocalFirstName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-800" // Verbesserte Input-Stile
              />
            </div>

            {/* Nachname */}
            <div className="mb-4 md:mb-0">
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="lastName">Nachname</label>
              <input
                type="text"
                id="lastName"
                value={localLastName}
                onChange={(e) => setLocalLastName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-800"
              />
            </div>

            {/* Geburtsdatum */}
            <div className="mb-4 md:mb-0">
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="dateOfBirth">Geburtsdatum</label>
              <input
                type="date"
                id="dateOfBirth"
                value={localDateOfBirth}
                onChange={(e) => setLocalDateOfBirth(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-800"
              />
            </div>

            {/* Telefonnummer */}
            <div className="mb-4 md:mb-0">
              <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="phoneNumber">
                Telefonnummer
              </label>
              <div className="flex gap-2 w-full">
                <select
                  className="w-20 flex-shrink-0 px-2 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-800 text-sm"
                  value={localPhoneCountryCode}
                  onChange={(e) => setLocalPhoneCountryCode(e.target.value)}
                >
                  <option value="+49">🇩🇪 +49</option>
                  <option value="+41">🇨🇭 +41</option>
                  <option value="+43">🇦🇹 +43</option>
                  {/* Füge hier weitere Ländercodes hinzu */}
                </select>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={localPhoneNumber}
                  onChange={(e) => setLocalPhoneNumber(e.target.value)}
                  required
                  placeholder="Deine Nummer"
                  className="flex-1 min-w-0 px-2 py-2 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-800"
                />
              </div>
            </div>
          </div> {/* Ende Grid */}

          {/* E-Mail (volle Breite) */}
          <div className="mb-4 mt-4"> {/* mt-4 für Abstand nach dem Grid */}
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="email">E-Mail</label>
            <input
              type="email"
              id="email"
              value={localEmail}
              onChange={(e) => setLocalEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-800"
            />
          </div>

          {/* Passwort */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">Passwort</label>
            <input
              type="password"
              id="password"
              value={localPassword}
              onChange={(e) => setLocalPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-800"
            />
          </div>

          {/* Passwort bestätigen */}
          <div className="mb-6"> {/* Abstand zum nächsten Element */}
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="confirmPassword">Passwort bestätigen</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-800"
            />
          </div>

          {/* Checkboxen */}
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded cursor-pointer" // Standard-Tailwind Checkbox
            />
            <label htmlFor="agreeTerms" className="ml-2 text-gray-700 text-sm cursor-pointer">
              Ich stimme den{" "}
              <a href="/terms" className="text-teal-600 hover:text-teal-800 underline transition-colors duration-200">
                Allgemeinen Geschäftsbedingungen
              </a>{" "}
              zu.
            </label>
          </div>

          <div className="mb-8 flex items-center"> {/* mb-8 für Abstand zum Button */}
            <input
              type="checkbox"
              id="soleOwner"
              checked={localIsSoleOwner}
              onChange={(e) => setLocalIsSoleOwner(e.target.checked)}
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded cursor-pointer" // Standard-Tailwind Checkbox
            />
            <label htmlFor="soleOwner" className="ml-2 text-teal-600 text-sm cursor-pointer">
              Ich bin alleiniger Inhaber und vertretungsberechtigt.
            </label>
          </div>

          {/* Weiter-Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={!isFormValid()} // Button ist deaktiviert, wenn das Formular nicht gültig ist
              className="w-full px-6 py-3 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:text-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50" // Verbesserter Button-Stil
            >
              Weiter
            </button>
          </div>
        </form>
      </div>

      {/* Modal für Schritte */}
      {isModalOpen && (
        // Overlay für den Hintergrund des Modals
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-sm border border-gray-200"> {/* Verbesserter Modal-Container */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Registrierung abschließen</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <FiX className="text-2xl" />
              </button>
            </div>
            <div className="mt-4 space-y-3"> {/* Abstand zwischen den Schritten */}
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  {index < 1 ? ( // Beispiel: Schritt 1 ist der aktuelle (index 0)
                    <FiCheck className="text-green-500 text-xl mr-2" />
                  ) : (
                    <div className="text-gray-400 text-xl mr-2">●</div> // Visueller Indikator für noch nicht abgeschlossene Schritte
                  )}
                  <p className="text-base sm:text-lg text-gray-700">{`${index + 1}. ${step}`}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-teal-500 text-white py-2 px-6 rounded-full hover:bg-teal-600 transition-colors duration-200 font-semibold" // Verbesserter Modal-Button
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
