import { forwardRef } from 'react'

import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', ...props }, ref) => {
    const variantClass = `btn-${variant}`
    const sizeClass = size === 'md' ? '' : `btn-${size}`
    return (
      <button
        className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
        ref={ref}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'

export default Button
