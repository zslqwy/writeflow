
export const downloadFile = (content: string, filename: string, type: 'json' | 'markdown' | 'text') => {
    const mimeTypes = {
        json: 'application/json',
        markdown: 'text/markdown',
        text: 'text/plain'
    };

    const blob = new Blob([content], { type: mimeTypes[type] });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const readJsonFile = (file: File): Promise<unknown> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result === 'string') {
                    resolve(JSON.parse(result));
                } else {
                    reject(new Error('Invalid file content'));
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};

export const readTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
                resolve(result);
            } else {
                reject(new Error('Invalid file content'));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};
