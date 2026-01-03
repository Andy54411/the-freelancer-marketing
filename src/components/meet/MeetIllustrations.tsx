'use client';

import React from 'react';

// Animierte Illustration: Link teilen
export function LinkShareIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hintergrund-Kreise mit Pulse-Animation */}
      <circle cx="150" cy="100" r="80" fill="#E0F2F1" opacity="0.5">
        <animate attributeName="r" values="75;85;75" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.3;0.5" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="150" cy="100" r="60" fill="#B2DFDB" opacity="0.6">
        <animate attributeName="r" values="55;65;55" dur="3s" repeatCount="indefinite" />
      </circle>
      
      {/* Link-Kette */}
      <g transform="translate(110, 70)">
        {/* Linker Link-Teil */}
        <path 
          d="M30 40 L10 40 A20 20 0 0 1 10 0 L30 0" 
          stroke="#14B8A6" 
          strokeWidth="8" 
          strokeLinecap="round" 
          fill="none"
        >
          <animateTransform 
            attributeName="transform" 
            type="translate" 
            values="0,0; -5,0; 0,0" 
            dur="2s" 
            repeatCount="indefinite" 
          />
        </path>
        
        {/* Rechter Link-Teil */}
        <path 
          d="M50 0 L70 0 A20 20 0 0 1 70 40 L50 40" 
          stroke="#0D9488" 
          strokeWidth="8" 
          strokeLinecap="round" 
          fill="none"
        >
          <animateTransform 
            attributeName="transform" 
            type="translate" 
            values="0,0; 5,0; 0,0" 
            dur="2s" 
            repeatCount="indefinite" 
          />
        </path>
        
        {/* Verbindungslinie */}
        <line x1="30" y1="20" x2="50" y2="20" stroke="#14B8A6" strokeWidth="8" strokeLinecap="round">
          <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
        </line>
      </g>
      
      {/* Kleine fliegende Punkte */}
      <circle cx="200" cy="60" r="4" fill="#14B8A6">
        <animate attributeName="cx" values="200;230;200" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0;1" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="210" cy="90" r="3" fill="#0D9488">
        <animate attributeName="cx" values="210;240;210" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0;1" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="195" cy="120" r="5" fill="#14B8A6">
        <animate attributeName="cx" values="195;225;195" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// Animierte Illustration: Kalender/Planung
export function ScheduleIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Kalender-Box */}
      <rect x="80" y="40" width="140" height="120" rx="12" fill="#E0F2F1" stroke="#14B8A6" strokeWidth="3" />
      
      {/* Header */}
      <rect x="80" y="40" width="140" height="35" rx="12" fill="#14B8A6" />
      <rect x="80" y="63" width="140" height="12" fill="#14B8A6" />
      
      {/* Kalender-Haken */}
      <rect x="105" y="30" width="8" height="25" rx="4" fill="#0D9488" />
      <rect x="187" y="30" width="8" height="25" rx="4" fill="#0D9488" />
      
      {/* Tage Grid */}
      <g fill="#B2DFDB">
        <rect x="95" y="90" width="20" height="20" rx="4" />
        <rect x="125" y="90" width="20" height="20" rx="4" />
        <rect x="155" y="90" width="20" height="20" rx="4" />
        <rect x="185" y="90" width="20" height="20" rx="4" />
        <rect x="95" y="120" width="20" height="20" rx="4" />
        <rect x="125" y="120" width="20" height="20" rx="4" />
        <rect x="185" y="120" width="20" height="20" rx="4" />
      </g>
      
      {/* Ausgewaehlter Tag mit Animation */}
      <rect x="155" y="120" width="20" height="20" rx="4" fill="#14B8A6">
        <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite" />
      </rect>
      
      {/* Checkmark Animation */}
      <g transform="translate(155, 120)">
        <path 
          d="M5 10 L9 14 L16 6" 
          stroke="white" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          fill="none"
        >
          <animate attributeName="stroke-dasharray" values="0,20;20,0" dur="0.8s" repeatCount="indefinite" />
        </path>
      </g>
      
      {/* Schwebende Uhr */}
      <g transform="translate(230, 50)">
        <circle cx="20" cy="20" r="18" fill="white" stroke="#14B8A6" strokeWidth="2">
          <animate attributeName="r" values="18;20;18" dur="2s" repeatCount="indefinite" />
        </circle>
        <line x1="20" y1="20" x2="20" y2="10" stroke="#0D9488" strokeWidth="2" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="10s" repeatCount="indefinite" />
        </line>
        <line x1="20" y1="20" x2="28" y2="20" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="60s" repeatCount="indefinite" />
        </line>
        <circle cx="20" cy="20" r="2" fill="#0D9488" />
      </g>
    </svg>
  );
}

// Animierte Illustration: Sicherheit/Schloss
export function SecurityIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Schutzschild */}
      <path 
        d="M150 30 L210 50 L210 110 C210 150 150 175 150 175 C150 175 90 150 90 110 L90 50 Z" 
        fill="#E0F2F1" 
        stroke="#14B8A6" 
        strokeWidth="3"
      >
        <animate attributeName="opacity" values="1;0.8;1" dur="2s" repeatCount="indefinite" />
      </path>
      
      {/* Innerer Schutzschild */}
      <path 
        d="M150 45 L195 60 L195 105 C195 135 150 155 150 155 C150 155 105 135 105 105 L105 60 Z" 
        fill="#B2DFDB"
      />
      
      {/* Schloss */}
      <g transform="translate(125, 70)">
        {/* Schlossbuegel */}
        <path 
          d="M15 30 L15 15 A10 10 0 0 1 35 15 L35 30" 
          stroke="#0D9488" 
          strokeWidth="5" 
          strokeLinecap="round" 
          fill="none"
        >
          <animate attributeName="d" 
            values="M15 30 L15 15 A10 10 0 0 1 35 15 L35 30;M15 30 L15 12 A10 10 0 0 1 35 12 L35 30;M15 30 L15 15 A10 10 0 0 1 35 15 L35 30" 
            dur="3s" 
            repeatCount="indefinite" 
          />
        </path>
        
        {/* Schlosskoerper */}
        <rect x="10" y="30" width="30" height="25" rx="4" fill="#14B8A6" />
        
        {/* Schluesselloch */}
        <circle cx="25" cy="40" r="4" fill="#0D9488" />
        <rect x="23" y="40" width="4" height="10" rx="2" fill="#0D9488" />
      </g>
      
      {/* Pulsierende Schutzringe */}
      <circle cx="150" cy="100" r="90" stroke="#14B8A6" strokeWidth="1" fill="none" opacity="0.3">
        <animate attributeName="r" values="85;95;85" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="150" cy="100" r="100" stroke="#14B8A6" strokeWidth="1" fill="none" opacity="0.2">
        <animate attributeName="r" values="95;105;95" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// Animierte Illustration: Bildschirm teilen
export function ScreenShareIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Monitor */}
      <rect x="60" y="30" width="180" height="110" rx="8" fill="#E0F2F1" stroke="#14B8A6" strokeWidth="3" />
      
      {/* Bildschirm */}
      <rect x="70" y="40" width="160" height="90" rx="4" fill="white" />
      
      {/* Fenster im Bildschirm */}
      <rect x="80" y="50" width="60" height="35" rx="3" fill="#B2DFDB" stroke="#14B8A6" strokeWidth="1">
        <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x="80" y="50" width="60" height="10" rx="3" fill="#14B8A6" />
      
      {/* Praesentation Inhalt */}
      <rect x="150" y="55" width="70" height="65" rx="3" fill="#14B8A6" opacity="0.2" />
      <rect x="158" y="65" width="50" height="6" rx="2" fill="#14B8A6" opacity="0.6" />
      <rect x="158" y="77" width="40" height="4" rx="2" fill="#14B8A6" opacity="0.4" />
      <rect x="158" y="87" width="45" height="4" rx="2" fill="#14B8A6" opacity="0.4" />
      <rect x="158" y="97" width="35" height="4" rx="2" fill="#14B8A6" opacity="0.4" />
      
      {/* Monitor Staender */}
      <rect x="140" y="140" width="20" height="15" fill="#B2DFDB" />
      <rect x="120" y="155" width="60" height="8" rx="4" fill="#14B8A6" />
      
      {/* Share-Pfeil Animation */}
      <g transform="translate(85, 55)">
        <path 
          d="M25 20 L25 5 L35 15 L25 25 Z" 
          fill="#0D9488"
        >
          <animateTransform 
            attributeName="transform" 
            type="translate" 
            values="0,0; 5,-5; 0,0" 
            dur="1.5s" 
            repeatCount="indefinite" 
          />
          <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
        </path>
      </g>
      
      {/* Verbindungslinien */}
      <line x1="240" y1="85" x2="270" y2="85" stroke="#14B8A6" strokeWidth="2" strokeDasharray="4,4">
        <animate attributeName="stroke-dashoffset" values="0;8" dur="1s" repeatCount="indefinite" />
      </line>
      <line x1="30" y1="85" x2="60" y2="85" stroke="#14B8A6" strokeWidth="2" strokeDasharray="4,4">
        <animate attributeName="stroke-dashoffset" values="8;0" dur="1s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

// Animierte Illustration: Teilnehmer/Team
export function ParticipantsIllustration({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hintergrund-Kreise */}
      <circle cx="150" cy="100" r="70" fill="#E0F2F1" opacity="0.5" />
      
      {/* Zentrale Person */}
      <g transform="translate(130, 60)">
        <circle cx="20" cy="15" r="15" fill="#14B8A6" />
        <path d="M0 55 A20 20 0 0 1 40 55" fill="#14B8A6" />
      </g>
      
      {/* Linke Person */}
      <g transform="translate(55, 85)">
        <circle cx="18" cy="12" r="12" fill="#0D9488">
          <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
        </circle>
        <path d="M0 45 A18 18 0 0 1 36 45" fill="#0D9488">
          <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
        </path>
      </g>
      
      {/* Rechte Person */}
      <g transform="translate(205, 85)">
        <circle cx="18" cy="12" r="12" fill="#0D9488">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
        </circle>
        <path d="M0 45 A18 18 0 0 1 36 45" fill="#0D9488">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
        </path>
      </g>
      
      {/* Linke obere Person */}
      <g transform="translate(70, 35)">
        <circle cx="14" cy="10" r="10" fill="#B2DFDB">
          <animate attributeName="cy" values="10;8;10" dur="3s" repeatCount="indefinite" />
        </circle>
        <path d="M0 35 A14 14 0 0 1 28 35" fill="#B2DFDB">
          <animate attributeName="d" values="M0 35 A14 14 0 0 1 28 35;M0 33 A14 14 0 0 1 28 33;M0 35 A14 14 0 0 1 28 35" dur="3s" repeatCount="indefinite" />
        </path>
      </g>
      
      {/* Rechte obere Person */}
      <g transform="translate(195, 35)">
        <circle cx="14" cy="10" r="10" fill="#B2DFDB">
          <animate attributeName="cy" values="10;12;10" dur="3s" repeatCount="indefinite" />
        </circle>
        <path d="M0 35 A14 14 0 0 1 28 35" fill="#B2DFDB">
          <animate attributeName="d" values="M0 35 A14 14 0 0 1 28 35;M0 37 A14 14 0 0 1 28 37;M0 35 A14 14 0 0 1 28 35" dur="3s" repeatCount="indefinite" />
        </path>
      </g>
      
      {/* Verbindungslinien */}
      <line x1="110" y1="95" x2="91" y2="110" stroke="#14B8A6" strokeWidth="2" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite" />
      </line>
      <line x1="190" y1="95" x2="209" y2="110" stroke="#14B8A6" strokeWidth="2" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite" />
      </line>
      <line x1="130" y1="70" x2="98" y2="60" stroke="#14B8A6" strokeWidth="2" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite" />
      </line>
      <line x1="170" y1="70" x2="202" y2="60" stroke="#14B8A6" strokeWidth="2" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite" />
      </line>
      
      {/* Pulsierende Punkte */}
      <circle cx="100" cy="105" r="3" fill="#14B8A6">
        <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="200" cy="105" r="3" fill="#14B8A6">
        <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
        <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
      </circle>
    </svg>
  );
}
