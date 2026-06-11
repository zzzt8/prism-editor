// User app storage adapters barrel export

import { UserAppStorageAdapter } from './ApiStorageAdapter';
export type { PublishedWorkflowMeta } from '../modules/repositories/interfaces';

// Server-first storage: published workflow list/detail are loaded from the public API.
export const userAppStorage = new UserAppStorageAdapter();
