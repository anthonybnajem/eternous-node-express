import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

const swaggerDef = {
  openapi: '3.0.0',
  info: {
    title: 'Matromony API documentation',
    version: packageJson.version,
    license: {},
  },
  servers: [
    {
      url: `http://${process.env.BACKEND_IP}:${config.port}/v1`,
    },
  ],
};

export default swaggerDef;
