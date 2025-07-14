// src/types/react-world-flags.d.ts (oder wo auch immer du sie ablegst)
declare module 'react-world-flags' {
  import * as React from 'react';

  export interface ReactWorldFlagsProps extends React.SVGProps<SVGSVGElement> {
    code: string | undefined; // Der Ländercode (z.B. 'DE', 'US')
    // Füge hier weitere Props hinzu, die die Komponente akzeptiert, falls bekannt
    // z.B. height?: string | number; width?: string | number;
  }

  const Flag: React.FC<ReactWorldFlagsProps>;
  export default Flag;
}
