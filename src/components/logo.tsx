import { cn } from '@/lib/utils'

export const Logo = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 100 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-6 w-auto', className)}
    >
      <text
        x="0"
        y="18"
        fill="#14ad9f"
        fontSize="18"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
      >
        TASKO
      </text>
    </svg>
  )
}

export const LogoIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-6 w-6', className)}
    >
      <circle cx="12" cy="12" r="10" fill="#14ad9f" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
      >
        T
      </text>
    </svg>
  )
}
