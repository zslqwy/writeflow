import { useParams } from 'react-router-dom';
import { useFileStore } from '../store/useFileStore';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { useEffect } from 'react';
export function Editor() {
    const { fileId } = useParams();
    const { files, openFile, updateFileContent } = useFileStore();
    const file = fileId ? files[fileId] : null;
    useEffect(() => {
        if (fileId) {
            openFile(fileId);
        }
    }, [fileId, openFile]);
    if (!file) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>File not found or select a file to start editing.</p>
            </div>
        );
    }
    return (
        <MarkdownEditor
            key={file.id} // Force re-mount on file change to reset state
            fileName={file.name}
            content={file.content || ''}
            onChange={(content) => updateFileContent(file.id, content)}
        />
    );
}