import * as React from "react"
import { cn } from "../../lib/utils"

// Note: I'm implementing a simplified version without cva dependency for now to keep it lightweight, 
// or I should install class-variance-authority. I'll install it to be proper.
// Actually, let's stick to the plan and just use clsx/tailwind-merge for now to avoid extra deps if not needed,
// but cva is standard for shadcn-like components. I'll use standard props for now.

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {

        const baseStyles = "inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

        const variants = {
            primary: "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20",
            secondary: "bg-gray-900 text-white hover:bg-gray-800",
            outline: "border-2 border-gray-200 bg-transparent hover:bg-gray-50 text-gray-900",
            ghost: "hover:bg-gray-100 text-gray-700",
        };

        const sizes = {
            sm: "h-9 px-4 text-sm",
            md: "h-11 px-8 text-base",
            lg: "h-14 px-8 text-lg",
        };

        return (
            <button
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                ref={ref}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : null}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
