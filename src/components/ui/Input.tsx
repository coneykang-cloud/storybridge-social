import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const baseInputClass =
  'w-full bg-white border-[1.5px] border-gray-200 rounded-xl px-4 py-3 text-charcoal ' +
  'focus:outline-none focus:border-mint-300 transition-colors placeholder:text-soft-gray'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-charcoal">{label}</label>
      )}
      <input
        ref={ref}
        className={clsx(
          baseInputClass,
          error && 'border-red-400 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-soft-gray">{hint}</p>}
    </div>
  )
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-charcoal">{label}</label>
      )}
      <textarea
        ref={ref}
        className={clsx(
          baseInputClass,
          'resize-none min-h-[160px] leading-relaxed',
          error && 'border-red-400 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-soft-gray">{hint}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'
