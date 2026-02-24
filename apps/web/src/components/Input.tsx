import { forwardRef, useId } from 'react'

import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, name, error, hint, className = '', id, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '')
    const inputId = id ?? `${name}-${generatedId}`
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

    return (
      <label className="field">
        <span>{label}</span>
        <input
          className={`input ${className}`.trim()}
          id={inputId}
          name={name}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        {error ? (
          <span className="field-error" id={`${inputId}-error`} role="alert">
            {error}
          </span>
        ) : hint ? (
          <span className="field-hint" id={`${inputId}-hint`}>
            {hint}
          </span>
        ) : null}
      </label>
    )
  },
)

Input.displayName = 'Input'

export default Input
