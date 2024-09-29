import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/ws': {
				target: 'http://localhost:8082/ws',
				changeOrigin: true,
				secure: false,
				ws: true
			}
		}
	}
});
