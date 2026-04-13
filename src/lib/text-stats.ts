export function countWords(text: string): number {
    if (!text.trim()) return 0;

    const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const nonChinese = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ');
    const englishWords = nonChinese.trim().split(/\s+/).filter((word) => word.length > 0).length;

    return chineseChars + englishWords;
}
