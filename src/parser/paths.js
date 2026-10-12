import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const paths={vendor:path.join(path.dirname(fileURLToPath(import.meta.url)),'vendor')};
