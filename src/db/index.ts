import Database from '@tauri-apps/plugin-sql';
import { INIT_SQL } from './schema';

let dbInstance: Database | null = null;

export const getDb = async (): Promise<Database> => {
  if (dbInstance) return dbInstance;
  
  try {
    if (typeof window === 'undefined') {
       // Server-side or build time
       throw new Error('Cannot connect to database on server side');
    }

    dbInstance = await Database.load('sqlite:ojflow.db');
    await initDb(dbInstance);
    return dbInstance;
  } catch (error) {
    console.error('Failed to load database:', error);
    throw error;
  }
};

const initDb = async (db: Database) => {
  for (const sql of INIT_SQL) {
    try {
      await db.execute(sql);
    } catch (e) {
      console.error('Error executing init SQL:', e, sql);
    }
  }
};
