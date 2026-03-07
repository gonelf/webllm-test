import React from 'react';

export const Button = React.forwardRef(({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 disabled:pointer-events-none ring-offset-white";
    const variants = {
        default: "bg-emerald-600 text-white hover:bg-emerald-700",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-gray-200 hover:bg-gray-100",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost: "hover:bg-gray-100 hover:text-gray-900",
        link: "underline-offset-4 hover:underline text-emerald-600"
    };
    const sizes = {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md"
    };
    return <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
});
Button.displayName = "Button";
