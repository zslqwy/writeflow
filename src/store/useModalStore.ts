import { create } from 'zustand';

export interface TreeNode {
    id: string;
    label: string;
    children?: TreeNode[];
    icon?: any; // strict typing for icon component is tricky in pure JS store, using any or string for now, or just ignore icon in store and only use default folder icon in rendering
}

type ModalType = 'confirm' | 'prompt' | 'select' | 'tree-select' | null;

interface ModalState {
    type: ModalType;
    title: string;
    message: string;
    defaultValue?: string;
    options?: { id: string; label: string }[];
    treeData?: TreeNode[];
    onConfirm?: (value?: any) => void;
    onCancel?: () => void;
}

interface ModalStore {
    modal: ModalState;

    showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
    showPrompt: (title: string, message: string, defaultValue: string, onSubmit: (value: string) => void, onCancel?: () => void) => void;
    showSelect: (title: string, message: string, options: { id: string; label: string }[], onSelect: (id: string) => void, onCancel?: () => void) => void;
    showTreeSelect: (title: string, message: string, data: TreeNode[], onSelect: (id: string) => void, onCancel?: () => void) => void;
    closeModal: () => void;
}

const initialState: ModalState = {
    type: null,
    title: '',
    message: '',
};

export const useModalStore = create<ModalStore>((set) => ({
    modal: initialState,

    showConfirm: (title, message, onConfirm, onCancel) => {
        set({
            modal: {
                type: 'confirm',
                title,
                message,
                onConfirm: () => {
                    set({ modal: initialState });
                    onConfirm();
                },
                onCancel: () => {
                    set({ modal: initialState });
                    onCancel?.();
                },
            },
        });
    },

    showPrompt: (title, message, defaultValue, onSubmit, onCancel) => {
        set({
            modal: {
                type: 'prompt',
                title,
                message,
                defaultValue,
                onConfirm: (value) => {
                    set({ modal: initialState });
                    if (value) onSubmit(value);
                },
                onCancel: () => {
                    set({ modal: initialState });
                    onCancel?.();
                },
            },
        });
    },

    showSelect: (title, message, options, onSelect, onCancel) => {
        set({
            modal: {
                type: 'select',
                title,
                message,
                options,
                onConfirm: (id) => {
                    set({ modal: initialState });
                    if (id) onSelect(id);
                },
                onCancel: () => {
                    set({ modal: initialState });
                    onCancel?.();
                },
            },
        });
    },

    showTreeSelect: (title, message, data, onSelect, onCancel) => {
        set({
            modal: {
                type: 'tree-select',
                title,
                message,
                treeData: data,
                onConfirm: (id) => {
                    set({ modal: initialState });
                    if (id) onSelect(id);
                },
                onCancel: () => {
                    set({ modal: initialState });
                    onCancel?.();
                },
            },
        });
    },

    closeModal: () => set({ modal: initialState }),
}));
