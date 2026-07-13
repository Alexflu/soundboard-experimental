import path from 'path';
import { fileURLToPath } from 'url';
import { rimrafSync } from 'rimraf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function deleteSourceMaps() {
  rimrafSync(path.join(__dirname, '../../src/dist/*.js.map'));
  rimrafSync(path.join(__dirname, '../../src/*.js.map'));
}
