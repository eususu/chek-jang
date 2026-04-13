import { getDatabaseConfig } from '../config';
import { Database } from './database';

export const db = new Database(getDatabaseConfig());
export { Database };
