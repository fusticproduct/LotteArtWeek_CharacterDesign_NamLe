import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { poseServer } from './mediapipe/vite-plugin.js';
import { defaultsWriter } from './scripts/vite-defaults.js';
export default defineConfig({plugins:[react(),tailwindcss(),poseServer(),defaultsWriter()],build:{chunkSizeWarningLimit:1500}});
