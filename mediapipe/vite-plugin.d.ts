import type {Plugin} from 'vite';
/** Dev/preview server route `/__pose/{start|stop|status}` that launches and stops `server.py`. */
export function poseServer():Plugin;
