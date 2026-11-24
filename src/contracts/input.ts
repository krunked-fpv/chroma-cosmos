/** Unified pointer gesture contract. */
export interface GestureEvent {
  phase: 'start' | 'move' | 'end' | 'cancel';
  /** internal-pixel float coordinates (0..480, 0..270) */
  x: number;
  y: number;
  pointerId: number;
  pointerType: string;
  pressure: number;
  tiltX: number;
  tiltY: number;
  timeMs: number;
}
