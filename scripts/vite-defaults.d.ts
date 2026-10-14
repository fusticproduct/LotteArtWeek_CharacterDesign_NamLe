import type {Plugin} from 'vite';
/** Dev-server routes `POST /__defaults/proportions` and `/__defaults/settings` that save "Save all as default" to src/proportions.json and src/settings.json. */
export function defaultsWriter():Plugin;
