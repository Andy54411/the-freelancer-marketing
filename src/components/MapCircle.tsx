// /components/MapCircle.tsx (Beispielpfad)
import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

interface MapCircleProps {
    center: google.maps.LatLngLiteral;
    radius: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWeight?: number;
}

export const MapCircle = (props: MapCircleProps) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        // Erstellt einen neuen Kreis
        const circle = new google.maps.Circle({
            ...props,
            map: map, // Fügt den Kreis zur Karte hinzu
        });

        // Aufräum-Funktion: Entfernt den Kreis, wenn die Komponente unmounted wird
        return () => {
            circle.setMap(null);
        };
    }, [map, props]); // Führt den Effekt erneut aus, wenn sich die Props ändern

    return null; // Diese Komponente rendert kein eigenes DOM-Element
};