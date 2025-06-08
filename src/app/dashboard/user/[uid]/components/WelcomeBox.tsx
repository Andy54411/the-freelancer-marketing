'use client'

interface WelcomeBoxProps {
  firstname: string
}

export const WelcomeBox = ({ firstname }: WelcomeBoxProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold">Willkommen zurück 👋</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
        Schön, dich wiederzusehen, {firstname}!
      </p>
    </div>
  )
}
