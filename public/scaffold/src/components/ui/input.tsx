import React from 'react';

export const Input = React.forwardRef(({ className = '', ...props }, ref) => {
    return (
        <input
            className={`flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            ref={ref}
            {...props}
        />
    );
});
Input.displayName = "Input";
