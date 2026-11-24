import type { KeepsakePort } from '../contracts/vault';
import { renderPostcard, saveText, savePng } from './postcard';

export { POSTCARD_W, POSTCARD_H, POSTCARD_FONT } from './postcard';

export function createKeepsake(): KeepsakePort {
  return { renderPostcard, savePng, saveText };
}
