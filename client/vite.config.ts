import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/api/socket.io/': {
				target: 'http://localhost:8082',
				changeOrigin: true,
				secure: false,
				ws: true
			}
		}
	}
});
