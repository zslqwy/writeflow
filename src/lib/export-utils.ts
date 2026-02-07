import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { FileNode } from '../store/useFileStore';

/**
 * Exports a file node (file or folder) to a ZIP archive.
 * If node is a file, exports a single text file (or adds to zip if part of folder).
 * If node is a folder, recursively adds children.
 */
export const exportToZip = async (
    rootNode: FileNode,
    allFiles: Record<string, FileNode>
) => {
    const zip = new JSZip();

    const addToZip = (node: FileNode, currentPath: string) => {
        if (node.type === 'file') {
            // Check for duplicate names? JSZip handles it but might overwrite. 
            // We assume unique names in writeflow but if not, we might need to handle it.
            // Converting content to blob/string
            const content = node.content || '';
            // For now assume markdown extension for all text files in zip
            const filename = `${node.name}.md`;
            zip.file(`${currentPath}${filename}`, content);
        } else {
            const folderName = node.name;
            const folderPath = `${currentPath}${folderName}/`;
            // Find children
            const children = Object.values(allFiles).filter(f => f.parentId === node.id);
            if (children.length === 0) {
                zip.folder(folderPath); // Create empty folder
            }
            children.forEach(child => addToZip(child, folderPath));
        }
    };

    if (rootNode.type === 'file') {
        addToZip(rootNode, '');
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, `${rootNode.name}.zip`);
    } else {
        // For folder, we want the folder itself to be the root of the zip or the contents?
        // Usually, if I export 'Chapter 1', I expect 'Chapter 1.zip' containing 'Chapter 1/...'
        // Let's behave like standard zip: the root folder is the container.
        // Actually, if we just add children, the zip will contain the children.

        // Strategy: Create a folder in zip with the rootNode name
        const rootFolder = zip.folder(rootNode.name);

        const children = Object.values(allFiles).filter(f => f.parentId === rootNode.id);

        const addChildrenToFolder = (node: FileNode, folder: JSZip | null) => {
            if (!folder) return;

            if (node.type === 'file') {
                const content = node.content || '';
                folder.file(`${node.name}.md`, content);
            } else {
                const newFolder = folder.folder(node.name);
                const kids = Object.values(allFiles).filter(f => f.parentId === node.id);
                kids.forEach(k => addChildrenToFolder(k, newFolder));
            }
        }

        children.forEach(child => addChildrenToFolder(child, rootFolder));

        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, `${rootNode.name}.zip`);
    }
};
