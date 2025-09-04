import type { State, Settings } from '../types/jira';
import { randomUUID } from '../utils/uuid';

interface Migration {
  version: number;
  migrate: (data: any) => any;
}

const localStorageMigrations: Migration[] = [
  {
    version: 1,
    migrate: (data: any) => ({
      ...data,
    }),
  },
  {
    version: 2,
    migrate: (data: { jiraToken: string; email: string; jiraSubdomain: string; displayOnNewLine: boolean; isHeaderNonFloating: boolean; theme: string }) => {
      const newId = randomUUID();
      return {
        accounts: [
          {
            id: newId,
            jiraSubdomain: data.jiraSubdomain,
            email: data.email,
            jiraToken: data.jiraToken,
          },
        ],
        activeAccount: newId,
        displayOnNewLine: data.displayOnNewLine,
        isHeaderNonFloating: data.isHeaderNonFloating,
        theme: data.theme,
      };
    },
  },
];

const jiraStateMigrations: Migration[] = [
  {
    version: 1,
    migrate: (data: any) => ({
      ...data,
      trackedTickets: data.trackedTickets || {},
      starredTickets: data.starredTickets || [],
    }),
  },
];

const LATEST_LOCAL_STORAGE_VERSION = localStorageMigrations.length ? Math.max(...localStorageMigrations.map((m) => m.version)) : 0;
const LATEST_JIRA_STATE_VERSION = jiraStateMigrations.length ? Math.max(...jiraStateMigrations.map((m) => m.version)) : 0;

function migrate(data: any, migrations: Migration[], latestVersion: number): { migratedData: any; isMigrated: boolean } {
  const originalVersion = data.version || 0;
  let currentVersion = originalVersion;
  let migratedData = { ...data };

  while (currentVersion < latestVersion) {
    const nextVersion = currentVersion + 1;
    const migration = migrations.find((m) => m.version === nextVersion);
    if (migration) {
      migratedData = migration.migrate(migratedData);
      migratedData.version = nextVersion;
    }
    currentVersion = nextVersion;
  }

  return { migratedData, isMigrated: originalVersion !== migratedData.version };
}

export function migrateLocalStorage(data: Settings): {
  migratedData: Settings;
  isMigrated: boolean;
} {
  const result = migrate(data, localStorageMigrations, LATEST_LOCAL_STORAGE_VERSION);
  return {
    migratedData: result.migratedData as Settings,
    isMigrated: result.isMigrated,
  };
}

export function migrateJiraState(data: State): {
  migratedData: State;
  isMigrated: boolean;
} {
  const result = migrate(data, jiraStateMigrations, LATEST_JIRA_STATE_VERSION);
  return {
    migratedData: result.migratedData as State,
    isMigrated: result.isMigrated,
  };
}
