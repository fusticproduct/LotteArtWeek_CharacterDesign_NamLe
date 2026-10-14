import type {Plugin} from 'vite';
/** Dev-server routes `POST /__defaults/proportions`, `/__defaults/settings` and `/__defaults/parade` that save "Save all as default" to src/proportions.json and src/settings.json, and the Parade's "Save as default" to src/parade.json. */
export function defaultsWriter():Plugin;
