import { APP_NAME, PAGE_W, PAGE_H } from './contracts';

const app = document.getElementById('app');
if (app) app.textContent = `${APP_NAME} (${PAGE_W}x${PAGE_H}) booting…`;
