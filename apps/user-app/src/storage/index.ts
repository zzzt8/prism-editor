// User app storage adapters barrel export

export { UserAppStorageAdapter } from './ApiStorageAdapter';

import { UserAppStorageAdapter } from './ApiStorageAdapter';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
export const userAppStorage = new UserAppStorageAdapter(apiBaseUrl);
