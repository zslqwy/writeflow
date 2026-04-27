import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'writeflow-persistence';
const DB_VERSION = 1;
const STORE_NAME = 'zustand-stores';
const OPEN_TIMEOUT_MS = 5000;

let databasePromise: Promise<IDBDatabase> | null = null;

export function createIndexedDBStorage(): StateStorage<Promise<void>> {
    return {
        getItem: async (name) => {
            if (!canUseIndexedDB()) return null;

            try {
                return await getIndexedDBValue(name);
            } catch (error) {
                console.error(`Failed to read "${name}" from IndexedDB.`, error);
                return null;
            }
        },

        setItem: async (name, value) => {
            if (!canUseIndexedDB()) {
                return;
            }

            try {
                await setIndexedDBValue(name, value);
            } catch (error) {
                console.error(`Failed to write "${name}" to IndexedDB.`, error);
            }
        },

        removeItem: async (name) => {
            if (!canUseIndexedDB()) {
                return;
            }

            try {
                await removeIndexedDBValue(name);
            } catch (error) {
                console.error(`Failed to remove "${name}" from IndexedDB.`, error);
            }
        },
    };
}

export async function clearIndexedDBPersistence(): Promise<void> {
    if (!canUseIndexedDB()) return;

    const database = databasePromise ? await databasePromise.catch(() => null) : null;
    database?.close();
    databasePromise = null;

    await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => {
            console.warn('IndexedDB reset is blocked by another open WriteFlow tab.');
            resolve();
        };
    });
}

function canUseIndexedDB(): boolean {
    return typeof indexedDB !== 'undefined';
}

async function getIndexedDBValue(name: string): Promise<string | null> {
    const value = await runStoreTransaction<string | undefined>('readonly', (store) => store.get(name));
    return value ?? null;
}

async function setIndexedDBValue(name: string, value: string): Promise<void> {
    await runStoreTransaction('readwrite', (store) => store.put(value, name));
}

async function removeIndexedDBValue(name: string): Promise<void> {
    await runStoreTransaction('readwrite', (store) => store.delete(name));
}

async function runStoreTransaction<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
    const database = await openDatabase();

    return new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = operation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.onerror = () => reject(transaction.error);
    });
}

function openDatabase(): Promise<IDBDatabase> {
    if (!databasePromise) {
        databasePromise = new Promise((resolve, reject) => {
            let settled = false;
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            const timeoutId = window.setTimeout(() => {
                if (settled) return;
                settled = true;
                databasePromise = null;
                reject(new Error(`Opening IndexedDB timed out after ${OPEN_TIMEOUT_MS}ms.`));
            }, OPEN_TIMEOUT_MS);

            const finish = (callback: () => void) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeoutId);
                callback();
            };

            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = () => finish(() => resolve(request.result));
            request.onerror = () => finish(() => {
                databasePromise = null;
                reject(request.error);
            });
            request.onblocked = () => {
                console.warn('IndexedDB open is blocked by another WriteFlow window.');
            };
        });
    }

    return databasePromise;
}
