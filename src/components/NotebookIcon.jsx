import React from 'react';

const NotebookIcon = ({ size = 24, className = '', weight = 'duotone', ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Main book spine body */}
      <rect
        x="9"
        y="3"
        width="6"
        height="18"
        rx="1.5"
        ry="1.5"
        fill="currentColor"
        fillOpacity={weight === 'duotone' ? '0.2' : '1'}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* Darker middle section (book spine) - fills entire center between lines */}
      <rect
        x="9.75"
        y="7.5"
        width="4.5"
        height="9"
        fill="currentColor"
        fillOpacity={weight === 'duotone' ? '0.4' : '0.6'}
      />
      
      {/* Top horizontal line */}
      <line
        x1="10"
        y1="6"
        x2="14"
        y2="6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Bottom horizontal line */}
      <line
        x1="10"
        y1="18"
        x2="14"
        y2="18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default NotebookIcon;
