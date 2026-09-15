import React from 'react';
import { Loader2 } from 'lucide-react';

const Spinner = ({ size = 24, className = '' }: { size?: number; className?: string }) => {
    return (
        <Loader2 size={size} className={`animate-spin ${className}`} />
    );
};

export default Spinner;
