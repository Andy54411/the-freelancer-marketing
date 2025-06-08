declare module 'lucide-react' {
  import * as React from 'react';

  export interface IconProps extends React.SVGProps<SVGSVGElement> {
    color?: string;
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = (props: IconProps) => JSX.Element;

  export const Menu: LucideIcon;
  export const X: LucideIcon;
  export const Search: LucideIcon;
  export const User: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const Shield: LucideIcon;
  export const Moon: LucideIcon;
  export const Sun: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowUp: LucideIcon;
  export const ArrowDown: LucideIcon;
  export const Check: LucideIcon;
  export const Plus: LucideIcon;
  export const Minus: LucideIcon;
  export const Trash: LucideIcon;
  export const Edit: LucideIcon;
  export const Save: LucideIcon;
  export const Copy: LucideIcon;
  export const Paste: LucideIcon;
  export const Download: LucideIcon;
  export const Upload: LucideIcon;
  export const Print: LucideIcon;
  export const Share: LucideIcon;
  export const Lock: LucideIcon;
  export const Unlock: LucideIcon;
  export const Bell: LucideIcon;
  export const Calendar: LucideIcon;
  export const Clock: LucideIcon;
  export const Location: LucideIcon;
  export const Phone: LucideIcon;
  export const Mail: LucideIcon;
  export const Globe: LucideIcon;
  export const Heart: LucideIcon;
  export const Star: LucideIcon;
  export const Bookmark: LucideIcon;
  export const Camera: LucideIcon;
  export const Video: LucideIcon;
  export const Music: LucideIcon;
  export const Play: LucideIcon;
  export const Pause: LucideIcon;
  export const Stop: LucideIcon;
  export const SkipForward: LucideIcon;
  export const SkipBack: LucideIcon;
  export const VolumeUp: LucideIcon;
  export const VolumeDown: LucideIcon;
  export const VolumeMute: LucideIcon;
  export const VolumeOff: LucideIcon;
  export const Microphone: LucideIcon;
  export const Headphones: LucideIcon;
  export const Speaker: LucideIcon;
  export const Laptop: LucideIcon;
  export const Desktop: LucideIcon;
  export const Tablet: LucideIcon;
  export const Mobile: LucideIcon;
  export const Keyboard: LucideIcon;
  export const Mouse: LucideIcon;
  export const Gamepad: LucideIcon;
  export const Controller: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronsUpDown: LucideIcon;
  export const PanelLeftIcon: LucideIcon;
  export const PanelRightIcon: LucideIcon;
  export const PanelTopIcon: LucideIcon;

  export const MoreHorizontal: LucideIcon;
  export const MoreVertical: LucideIcon;

  export const ArrowRightCircle: LucideIcon;
  export const ArrowLeftCircle: LucideIcon;
  export const ArrowUpCircle: LucideIcon;
  export const ArrowDownCircle: LucideIcon;

  export const ArrowRightSquare: LucideIcon;
  export const ArrowLeftSquare: LucideIcon;
  export const ArrowUpSquare: LucideIcon;
  export const ArrowDownSquare: LucideIcon;

  export const ArrowRightTriangle: LucideIcon;
  export const ArrowLeftTriangle: LucideIcon;
  export const ArrowUpTriangle: LucideIcon;
  export const ArrowDownTriangle: LucideIcon;

  export const ArrowRightOctagon: LucideIcon;
  export const ArrowLeftOctagon: LucideIcon;
  export const ArrowUpOctagon: LucideIcon;
  export const ArrowDownOctagon: LucideIcon;

  export const ArrowRightDiamond: LucideIcon;
  export const CircleSlash: LucideIcon;
  export const SearchIcon: LucideIcon;
  export const XIcon: LucideIcon;
  export const ChevronLeft: LucideIcon;
}
