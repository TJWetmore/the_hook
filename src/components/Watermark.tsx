import { useEffect, useState } from 'react';

interface WatermarkProps {
    text: string;
    opacity?: number;
}

// Watermark opacity is 0.03 by default
// Presents the User ID of whomever took a screenshot of the app
export default function Watermark({ text, opacity = 0.03 }: WatermarkProps) {
    const [background, setBackground] = useState('');

    useEffect(() => {
        // Create an SVG string for the watermark
        // We rotate it for better coverage and "official" look
        const svgString = `
            <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
                <style>
                    text { fill: #000; font-family: sans-serif; font-size: 14px; font-weight: bold; }
                </style>
                <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" transform="rotate(-45 150 150)">
                    ${text}
                </text>
            </svg>
        `;

        // Encode it for CSS
        const encoded = encodeURIComponent(svgString);
        setBackground(`url("data:image/svg+xml;charset=utf-8,${encoded}")`);
    }, [text]);

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
            style={{
                backgroundImage: background,
                opacity: opacity,
                mixBlendMode: 'multiply' // Helps it blend into both light and dark backgrounds better (though multiply vanishes on black)
                // For dark mode, we might want a different strategy or ensure text color handles it. 
                // Let's stick to simple opacity for now, maybe white text for dark mode?
                // Actually, let's use a distinct color or just gray that shows up on both?
                // Gray #888 might work on white and black.
            }}
        >
        </div>
    );
}
