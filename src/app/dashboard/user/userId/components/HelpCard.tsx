'use client'

export const HelpCard = () => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold">Support</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
        Du brauchst Hilfe oder hast Fragen? Unser Support-Team ist für dich da.
      </p>
      <a
        href="mailto:support@tasko.de"
        className="text-primary font-medium mt-4 inline-block"
      >
        Zum Support schreiben →
      </a>
    </div>
  )
}
