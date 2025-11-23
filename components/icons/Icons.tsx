import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

export function ApexLogo(props: IconProps) {
    return (
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

export function BrainCircuitIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M12 5a3 3 0 1 0-5.993.131"/>
            <path d="M12 5a3 3 0 1 0 5.993.131"/>
            <path d="M12 19a3 3 0 1 0-5.993-.131"/>
            <path d="M12 19a3 3 0 1 0 5.993-.131"/>
            <path d="M12 12a3 3 0 1 0-5.993.131"/>
            <path d="M12 12a3 3 0 1 0 5.993.131"/>
            <path d="M12 5a3 3 0 1 1-5.993-.131"/>
            <path d="M12 5a3 3 0 1 1 5.993-.131"/>
            <path d="M12 19a3 3 0 1 1-5.993.131"/>
            <path d="M12 19a3 3 0 1 1 5.993.131"/>
            <path d="M12 12a3 3 0 1 1-5.993-.131"/>
            <path d="M12 12a3 3 0 1 1 5.993.131"/>
            <path d="M21 12h-3"/>
            <path d="M6 12H3"/>
            <path d="m16.243 7.757-.196-.196"/>
            <path d="m7.953 16.047-.196-.196"/>
            <path d="m16.047 16.047-.196-.196"/>
            <path d="m7.757 7.757-.196-.196"/>
        </svg>
    );
}

export function SparklesIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="m12 3-1.9 4.8-4.8 1.9 4.8 1.9L12 21l1.9-4.8 4.8-1.9-4.8-1.9L12 3z"/>
            <path d="M5 3v4"/>
            <path d="M19 17v4"/>
            <path d="M3 5h4"/>
            <path d="M17 19h4"/>
        </svg>
    );
}

export function StarIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" {...props}>
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
    );
}

export function ClipboardIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
    );
}

export function CheckIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <polyline points="20 6 9 17 4 12"/>
        </svg>
    );
}

export function ChevronDownIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="m6 9 6 6 6-6"/>
        </svg>
    );
}

export function ChevronUpIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="m18 15-6-6-6 6"/>
        </svg>
    );
}

export function RiskIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="m13 2-3 5h4l-3 5"/>
            <path d="M15.5 12H19a2 2 0 0 1 1.7 2.9l-4.2 7.2A2 2 0 0 1 14.8 21H5.2a2 2 0 0 1-1.8-2.9l4.3-7.2A2 2 0 0 1 9.5 8H11"/>
        </svg>
    );
}

export function DocumentIcon(props: IconProps) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
    );
}
