import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { users, items, claims } from "@shared/schema";
import path from "path";
import fs from "fs";

// Create SQLite database file (in project root)
const sqlitePath = path.join(process.cwd(), "database.sqlite");
const sqlite = new Database(sqlitePath);

// Enable foreign keys
sqlite.pragma("foreign_keys = ON");

// Create drizzle instance
export const db = drizzle(sqlite, { schema: { users, items, claims } });

// Run migrations on startup by executing SQL from server/sql/init.sql
export function initializeDatabase() {
  try {
    const initSqlPath = path.join(process.cwd(), "server", "sql", "init.sql");
    if (fs.existsSync(initSqlPath)) {
      const sql = fs.readFileSync(initSqlPath, "utf8"); 
      sqlite.exec(sql);
      console.log(`Database initialized from ${initSqlPath}`);
    } else {
      console.warn(`Initialization SQL not found at ${initSqlPath}. Skipping initialization.`);
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}
