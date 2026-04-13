import { Pool, PoolClient, PoolConfig } from 'pg';
import { DatabaseConfig } from '../types';

export class Database {
  private pool: Pool;
  private client?: PoolClient;

  constructor(config: DatabaseConfig) {
    const poolConfig: PoolConfig = config.connectionString
      ? { connectionString: config.connectionString }
      : {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
        };
    this.pool = new Pool(poolConfig);
  }

  /** Internal constructor for transaction-scoped Database instances */
  private static fromClient(pool: Pool, client: PoolClient): Database {
    const db = Object.create(Database.prototype) as Database;
    db.pool = pool;
    db.client = client;
    return db;
  }

  private getExecutor(): Pool | PoolClient {
    return this.client ?? this.pool;
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    const result = await this.getExecutor().query(sql, params);
    return result.rows[0] as T | undefined;
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.getExecutor().query(sql, params);
    return result.rows as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    const result = await this.getExecutor().query(sql, params);
    const lastInsertRowId = result.rows?.[0]?.id ?? 0;
    const changes = result.rowCount ?? 0;
    return { lastInsertRowId, changes };
  }

  async transaction<T>(fn: (client: Database) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const txDb = Database.fromClient(this.pool, client);
    try {
      await client.query('BEGIN');
      const result = await fn(txDb);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS novels (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description VARCHAR(1000) NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id SERIAL PRIMARY KEY,
        novel_id INTEGER NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        order_num INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id)
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(novel_id, order_num)
    `);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
