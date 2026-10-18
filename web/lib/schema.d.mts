import type { Client } from '@libsql/client';

export declare const SCHEMA_VERSION: number;
export declare const CREATE_LEADS_TABLE: string;
export declare const CREATE_INDEXES: string[];
export declare const CREATE_SCHEMA_MIGRATIONS: string;
export declare const SCHEMA_SQL: string;
export declare const LEAD_COLUMNS_V2: Array<{ name: string; ddl: string }>;

/** Версия схемы из schema_migrations; 0, если таблицы ещё нет. */
export declare function readSchemaVersion(client: Client): Promise<number>;

/** Применяет идемпотентную миграцию к клиенту libSQL. */
export declare function applyMigrations(client: Client): Promise<void>;
