import dotenv from 'dotenv';
import { DatabaseConfig } from './types';

dotenv.config();

export function getDatabaseConfig(): DatabaseConfig {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'novels',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  };
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  authToken: process.env.AUTH_TOKEN || '',
  database: getDatabaseConfig(),
};
