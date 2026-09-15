import React, { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import Spinner from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

const Button = ({
    children,
    className,
    isLoading,
    variant = 'primary',
    disabled,
    ...props
}: ButtonProps) => {
    const baseStyles = "inline-flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

    const variants = {
        primary: "border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
        secondary: "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500",
        danger: "border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500",
        ghost: "border-transparent text-blue-600 bg-transparent hover:bg-blue-50 shadow-none"
    };

    return (
        <button
            className={twMerge(baseStyles, variants[variant], className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Spinner size={16} className="mr-2" />}
            {children}
        </button>
    );
};

export default Button;
