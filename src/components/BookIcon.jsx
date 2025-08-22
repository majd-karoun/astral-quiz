import React from 'react';

const BookIcon = ({ size = 24, className = '', weight = 'duotone', ...props }) => {
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
      {/* First book */}
      <rect
        x="3"
        y="3"
        width="6"
        height="18"
        rx="1"
        ry="1"
        fill="currentColor"
        fillOpacity={weight === 'duotone' ? '0.2' : '1'}
        stroke="currentColor"
        strokeWidth="1"
      />
      
      {/* First book darker middle section */}
      <rect
        x="3"
        y="7.5"
        width="6"
        height="9"
        fill="currentColor"
        fillOpacity={weight === 'duotone' ? '0.4' : '0.6'}
      />
      
      {/* First book top line */}
      <line
        x1="3"
        y1="6"
        x2="9"
        y2="6"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      
      {/* First book bottom line */}
      <line
        x1="3"
        y1="18"
        x2="9"
        y2="18"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Second book */}
      <g className="right-book">
        <rect
          x="15"
          y="3"
          width="6"
          height="18"
          rx="1"
          ry="1"
          fill="currentColor"
          fillOpacity={weight === 'duotone' ? '0.2' : '1'}
          stroke="currentColor"
          strokeWidth="1"
        />
        
        {/* Second book darker middle section */}
        <rect
          x="15"
          y="7.5"
          width="6"
          height="9"
          fill="currentColor"
          fillOpacity={weight === 'duotone' ? '0.4' : '0.6'}
        />
        
        {/* Second book top line */}
        <line
          x1="15"
          y1="6"
          x2="21"
          y2="6"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
        
        {/* Second book bottom line */}
        <line
          x1="15"
          y1="18"
          x2="21"
          y2="18"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export default BookIcon;
