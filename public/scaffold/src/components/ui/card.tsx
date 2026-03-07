import React from 'react';

export const Card = React.forwardRef(({ className = '', ...props }, ref) => (
    <div ref={ref} className={`rounded-lg border border-gray-200 bg-white text-gray-950 shadow-sm ${className}`} {...props} />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef(({ className = '', ...props }, ref) => (
    <div ref={ref} className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef(({ className = '', ...props }, ref) => (
    <h3 ref={ref} className={`font-semibold leading-none tracking-tight ${className}`} {...props} />
));
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef(({ className = '', ...props }, ref) => (
    <div ref={ref} className={`p-6 pt-0 ${className}`} {...props} />
));
CardContent.displayName = "CardContent";
