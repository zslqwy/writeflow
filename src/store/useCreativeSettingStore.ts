import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

import { createIndexedDBStorage } from '../lib/indexeddb-storage';

export type CreativeScope = 'project' | 'folder' | 'file';
export type SceneStatus = 'seed' | 'draft' | 'locked';
export type WorldCategory = 'place' | 'rule' | 'history' | 'culture' | 'object' | 'other';

export interface CreativeScene {
    id: string;
    title: string;
    summary: string;
    timeLabel: string;
    location: string;
    characterIds: string[];
    conflict: string;
    outcome: string;
    status: SceneStatus;
    order: number;
    createdAt: number;
    updatedAt: number;
}

export interface CharacterRelation {
    id: string;
    targetCharacterId: string;
    type: string;
    note: string;
}

export interface CreativeCharacter {
    id: string;
    name: string;
    role: string;
    description: string;
    motivation: string;
    arc: string;
    relations: CharacterRelation[];
    createdAt: number;
    updatedAt: number;
}

export interface WorldEntry {
    id: string;
    title: string;
    category: WorldCategory;
    content: string;
    createdAt: number;
    updatedAt: number;
}

export interface CreativeProfile {
    scope: CreativeScope;
    scopeId: string;
    premise: string;
    outline: string;
    scenes: CreativeScene[];
    characters: CreativeCharacter[];
    worldEntries: WorldEntry[];
    createdAt: number;
    updatedAt: number;
}

type ProfileUpdates = Partial<Pick<CreativeProfile, 'premise' | 'outline'>>;
type SceneUpdates = Partial<Omit<CreativeScene, 'id' | 'createdAt' | 'updatedAt'>>;
type CharacterUpdates = Partial<Omit<CreativeCharacter, 'id' | 'relations' | 'createdAt' | 'updatedAt'>>;
type WorldEntryUpdates = Partial<Omit<WorldEntry, 'id' | 'createdAt' | 'updatedAt'>>;

export interface CreativeSettingStore {
    profiles: Record<string, CreativeProfile>;
    updateProfile: (scope: CreativeScope, scopeId: string, updates: ProfileUpdates) => void;
    addScene: (scope: CreativeScope, scopeId: string, title?: string) => string;
    updateScene: (scope: CreativeScope, scopeId: string, sceneId: string, updates: SceneUpdates) => void;
    deleteScene: (scope: CreativeScope, scopeId: string, sceneId: string) => void;
    moveScene: (scope: CreativeScope, scopeId: string, sceneId: string, direction: -1 | 1) => void;
    addCharacter: (scope: CreativeScope, scopeId: string, name?: string) => string;
    updateCharacter: (scope: CreativeScope, scopeId: string, characterId: string, updates: CharacterUpdates) => void;
    deleteCharacter: (scope: CreativeScope, scopeId: string, characterId: string) => void;
    addRelation: (scope: CreativeScope, scopeId: string, sourceCharacterId: string, targetCharacterId: string, type: string, note?: string) => string | null;
    deleteRelation: (scope: CreativeScope, scopeId: string, sourceCharacterId: string, relationId: string) => void;
    addWorldEntry: (scope: CreativeScope, scopeId: string, title?: string) => string;
    updateWorldEntry: (scope: CreativeScope, scopeId: string, entryId: string, updates: WorldEntryUpdates) => void;
    deleteWorldEntry: (scope: CreativeScope, scopeId: string, entryId: string) => void;
    importProfiles: (profiles: Record<string, CreativeProfile>) => void;
}

export const getCreativeProfileKey = (scope: CreativeScope, scopeId: string): string => `${scope}:${scopeId}`;

export const createEmptyCreativeProfile = (scope: CreativeScope, scopeId: string): CreativeProfile => {
    const now = Date.now();

    return {
        scope,
        scopeId,
        premise: '',
        outline: '',
        scenes: [],
        characters: [],
        worldEntries: [],
        createdAt: now,
        updatedAt: now,
    };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isCreativeScope = (value: unknown): value is CreativeScope => {
    return value === 'project' || value === 'folder' || value === 'file';
};

const isSceneStatus = (value: unknown): value is SceneStatus => {
    return value === 'seed' || value === 'draft' || value === 'locked';
};

const isWorldCategory = (value: unknown): value is WorldCategory => {
    return value === 'place'
        || value === 'rule'
        || value === 'history'
        || value === 'culture'
        || value === 'object'
        || value === 'other';
};

const isCreativeScene = (value: unknown): value is CreativeScene => {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.title === 'string'
        && typeof value.summary === 'string'
        && typeof value.timeLabel === 'string'
        && typeof value.location === 'string'
        && Array.isArray(value.characterIds)
        && value.characterIds.every((id) => typeof id === 'string')
        && typeof value.conflict === 'string'
        && typeof value.outcome === 'string'
        && isSceneStatus(value.status)
        && typeof value.order === 'number'
        && typeof value.createdAt === 'number'
        && typeof value.updatedAt === 'number';
};

const isCharacterRelation = (value: unknown): value is CharacterRelation => {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.targetCharacterId === 'string'
        && typeof value.type === 'string'
        && typeof value.note === 'string';
};

const isCreativeCharacter = (value: unknown): value is CreativeCharacter => {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.name === 'string'
        && typeof value.role === 'string'
        && typeof value.description === 'string'
        && typeof value.motivation === 'string'
        && typeof value.arc === 'string'
        && Array.isArray(value.relations)
        && value.relations.every(isCharacterRelation)
        && typeof value.createdAt === 'number'
        && typeof value.updatedAt === 'number';
};

const isWorldEntry = (value: unknown): value is WorldEntry => {
    return isRecord(value)
        && typeof value.id === 'string'
        && typeof value.title === 'string'
        && isWorldCategory(value.category)
        && typeof value.content === 'string'
        && typeof value.createdAt === 'number'
        && typeof value.updatedAt === 'number';
};

const isCreativeProfile = (value: unknown): value is CreativeProfile => {
    return isRecord(value)
        && isCreativeScope(value.scope)
        && typeof value.scopeId === 'string'
        && typeof value.premise === 'string'
        && typeof value.outline === 'string'
        && Array.isArray(value.scenes)
        && value.scenes.every(isCreativeScene)
        && Array.isArray(value.characters)
        && value.characters.every(isCreativeCharacter)
        && Array.isArray(value.worldEntries)
        && value.worldEntries.every(isWorldEntry)
        && typeof value.createdAt === 'number'
        && typeof value.updatedAt === 'number';
};

const normalizeProfiles = (profiles: Record<string, CreativeProfile>): Record<string, CreativeProfile> => {
    return Object.fromEntries(
        Object.values(profiles)
            .filter(isCreativeProfile)
            .map((profile) => [
                getCreativeProfileKey(profile.scope, profile.scopeId),
                {
                    ...profile,
                    scenes: normalizeSceneOrder(profile.scenes),
                },
            ])
    );
};

const normalizeSceneOrder = (scenes: CreativeScene[]): CreativeScene[] => {
    return [...scenes]
        .sort((a, b) => a.order - b.order)
        .map((scene, index) => ({ ...scene, order: index }));
};

const getProfileForUpdate = (
    profiles: Record<string, CreativeProfile>,
    scope: CreativeScope,
    scopeId: string
): CreativeProfile => {
    return profiles[getCreativeProfileKey(scope, scopeId)] || createEmptyCreativeProfile(scope, scopeId);
};

const setProfile = (
    profiles: Record<string, CreativeProfile>,
    profile: CreativeProfile
): Record<string, CreativeProfile> => ({
    ...profiles,
    [getCreativeProfileKey(profile.scope, profile.scopeId)]: {
        ...profile,
        updatedAt: Date.now(),
    },
});

const createScene = (title: string, order: number): CreativeScene => {
    const now = Date.now();

    return {
        id: uuidv4(),
        title,
        summary: '',
        timeLabel: '',
        location: '',
        characterIds: [],
        conflict: '',
        outcome: '',
        status: 'seed',
        order,
        createdAt: now,
        updatedAt: now,
    };
};

const createCharacter = (name: string): CreativeCharacter => {
    const now = Date.now();

    return {
        id: uuidv4(),
        name,
        role: '',
        description: '',
        motivation: '',
        arc: '',
        relations: [],
        createdAt: now,
        updatedAt: now,
    };
};

const createWorldEntry = (title: string): WorldEntry => {
    const now = Date.now();

    return {
        id: uuidv4(),
        title,
        category: 'place',
        content: '',
        createdAt: now,
        updatedAt: now,
    };
};

export const useCreativeSettingStore = create<CreativeSettingStore>()(
    persist(
        (set) => ({
            profiles: {},

            updateProfile: (scope, scopeId, updates) => set((state) => {
                const profile = getProfileForUpdate(state.profiles, scope, scopeId);
                return {
                    profiles: setProfile(state.profiles, {
                        ...profile,
                        ...updates,
                    }),
                };
            }),

            addScene: (scope, scopeId, title = 'New Scene') => {
                let sceneId = '';

                set((state) => {
                    const profile = getProfileForUpdate(state.profiles, scope, scopeId);
                    const scene = createScene(title, profile.scenes.length);
                    sceneId = scene.id;

                    return {
                        profiles: setProfile(state.profiles, {
                            ...profile,
                            scenes: [...profile.scenes, scene],
                        }),
                    };
                });

                return sceneId;
            },

            updateScene: (scope, scopeId, sceneId, updates) => set((state) => {
                const profile = getProfileForUpdate(state.profiles, scope, scopeId);

                return {
                    profiles: setProfile(state.profiles, {
                        ...profile,
                        scenes: profile.scenes.map((scene) => scene.id === sceneId
                            ? { ...scene, ...updates, updatedAt: Date.now() }
                            : scene
                        ),
                    }),
                };
            }),

            deleteScene: (scope, scopeId, sceneId) => set((state) => {
                const profile = getProfileForUpdate(state.profiles, scope, scopeId);

                return {
                    profiles: setProfile(state.profiles, {
                        ...profile,
                        scenes: normalizeSceneOrder(profile.scenes.filter((scene) => scene.id !== sceneId)),
                    }),
                };
            }),

            moveScene: (scope, scopeId, sceneId, direction) => set((state) => {
                const profile = getProfileForUpdate(state.profiles, scope, scopeId);
                const scenes = normalizeSceneOrder(profile.scenes);
                const currentIndex = scenes.findIndex((scene) => scene.id === sceneId);
                const nextIndex = currentIndex + direction;

                if (currentIndex < 0 || nextIndex < 0 || nextIndex >= scenes.length) {
                    return state;
                }

                const nextScenes = [...scenes];
                const currentScene = nextScenes[currentIndex];
                nextScenes[currentIndex] = nextScenes[nextIndex];
                nextScenes[nextIndex] = currentScene;

                return {
                    profiles: setProfile(state.profiles, {
                        ...profile,
                        scenes: normalizeSceneOrder(nextScenes),
                    }),
                };
            }),

            addCharacter: (scope, scopeId, name = 'New Character') => {
                let characterId = '';

                set((state) => {
                    const profile = getProfileForUpdate(state.profiles, scope, scopeId);
                    const character = createCharacter(name);
                    characterId = character.id;

                    return {
                        profiles: setProfile(state.profiles, {
                            ...profile,
                            characters: [...profile.characters, character],
                        }),
                    };
                });

                return characterId;
            },

            updateCharacter: (scope, scopeId, characterId, updates) => set((state) => {
                const profile = getProfileForUpdate(state.profiles, scope, scopeId);

                return {
                    profiles: setProfile(state.profiles, {
                        ...profile,
                        characters: profile.characters.map((character) => character.id === characterId
                            ? { ...character, ...updates, updatedAt: Date.now() }
                            : character
                        ),
                    }),
                };
            }),

            deleteCharacter: (scope, scopeId, characterId) => set((state) => {
                const profile = getProfileForUpdate(state.profiles, scope, scopeId);

                return {
                    profiles: setProfile(state.profiles, {
                        ...profile,
                        scenes: profile.scenes.map((scene) => ({
                            ...scene,
                            characterIds: scene.characterIds.filter((id) => id !== characterId),
                        })),
                        characters: profile.characters
                            .filter((character) => character.id !== characterId)
                            .map((character) => ({
                                ...character,
                                relations: character.relations.filter((relation) => relation.targetCharacterId !== characterId),
                            })),
                    }),
                };
            }),

            addRelation: (scope, scopeId, sourceCharacterId, targetCharacterId, type, note = '') => {
                if (sourceCharacterId === targetCharacterId || !targetCharacterId || !type.trim()) {
                    return null;
                }

                const relationId = uuidv4();

                set((state) => {
                    const profile = getProfileForUpdate(state.profiles, scope, scopeId);

                    return {
                        profiles: setProfile(state.profiles, {
                            ...profile,
                            characters: profile.characters.map((character) => character.id === sourceCharacterId
                                ? {
                                    ...character,
                                    relations: [
                                        ...character.relations,
                                        {
                                            id: relationId,
                                            targetCharacterId,
                                            type: type.trim(),
                                            note: note.trim(),
                                        },
                                    ],
                                    updatedAt: Date.now(),
                                }
                                : character
                            ),
                        }),
                    };
                });

                return relationId;
            },

            deleteRelation: (scope, scopeId, sourceCharacterId, relationId) => set((state) => {
                const profile = getProfileForUpdate(state.profiles, scope, scopeId);

                return {
                    profiles: setProfile(state.profiles, {
                        ...profile,
                        characters: profile.characters.map((character) => character.id === sourceCharacterId
                            ? {
                                ...character,
                                relations: character.relations.filter((relation) => relation.id !== relationId),
                                updatedAt: Date.now(),
                            }
                            : character
                        ),
                    }),
                };
            }),

            addWorldEntry: (scope, scopeId, title = 'New World Entry') => {
                let entryId = '';

                set((state) => {
                    const profile = getProfileForUpdate(state.profiles, scope, scopeId);
                    const entry = createWorldEntry(title);
                    entryId = entry.id;

                    return {
                        profiles: setProfile(state.profiles, {
                            ...profile,
                            worldEntries: [entry, ...profile.worldEntries],
                        }),
                    };
                });

                return entryId;
            },

            updateWorldEntry: (scope, scopeId, entryId, updates) => set((state) => {
                const profile = getProfileForUpdate(state.profiles, scope, scopeId);

                return {
                    profiles: setProfile(state.profiles, {
                        ...profile,
                        worldEntries: profile.worldEntries.map((entry) => entry.id === entryId
                            ? { ...entry, ...updates, updatedAt: Date.now() }
                            : entry
                        ),
                    }),
                };
            }),

            deleteWorldEntry: (scope, scopeId, entryId) => set((state) => {
                const profile = getProfileForUpdate(state.profiles, scope, scopeId);

                return {
                    profiles: setProfile(state.profiles, {
                        ...profile,
                        worldEntries: profile.worldEntries.filter((entry) => entry.id !== entryId),
                    }),
                };
            }),

            importProfiles: (profiles) => set({ profiles: normalizeProfiles(profiles) }),
        }),
        {
            name: 'writeflow-creative-settings',
            storage: createJSONStorage(() => createIndexedDBStorage()),
        }
    )
);
