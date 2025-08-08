/**
 * 聊天消息文本格式化工具
 * 用于处理 AI 回复内容的格式化
 */

/**
 * 格式化聊天回复文本
 * 1. 去除 Markdown 格式符号 (*# 等)
 * 2. 按句号、感叹号、问号分行
 * 3. 删除每行句末的句号
 */
export function formatChatResponse(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // 1. 去除 Markdown 格式符号
  const formattedText = text
    // 去除加粗和斜体标记
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // **粗体** -> 粗体
    .replace(/\*([^*]+)\*/g, '$1')      // *斜体* -> 斜体
    .replace(/__([^_]+)__/g, '$1')      // __粗体__ -> 粗体
    .replace(/_([^_]+)_/g, '$1')        // _斜体_ -> 斜体
    // 去除标题标记
    .replace(/^#{1,6}\s+/gm, '')        // # 标题 -> 标题
    // 去除代码块标记
    .replace(/```[\s\S]*?```/g, (match) => {
      // 保留代码块内容，但去除标记
      return match.replace(/```\w*\n?/g, '').replace(/```$/g, '');
    })
    // 去除行内代码标记
    .replace(/`([^`]+)`/g, '$1')        // `代码` -> 代码
    // 去除链接标记
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [文本](链接) -> 文本
    // 去除引用标记
    .replace(/^>\s+/gm, '')             // > 引用 -> 引用
    // 去除列表标记
    .replace(/^[-*+]\s+/gm, '')         // - 列表 -> 列表
    .replace(/^\d+\.\s+/gm, '')         // 1. 列表 -> 列表
    // 去除分割线
    .replace(/^---+$/gm, '')
    .replace(/^\*\*\*+$/gm, '')
    // 去除其他特殊符号
    .replace(/~~([^~]+)~~/g, '$1')      // ~~删除线~~ -> 删除线
    .replace(/\^\^([^^]+)\^\^/g, '$1')  // ^^上标^^ -> 上标
    .replace(/==([^=]+)==/g, '$1');     // ==高亮== -> 高亮

  // 2. 按句号、感叹号、问号分行
  // 先替换现有换行为特殊标记，然后处理句子分割
  const preprocessed = formattedText.replace(/\n/g, ' |LINEBREAK| ');
  
  // 按句子结束符分割，但保持简单直接
  const sentences = preprocessed
    .split(/([.。!！?？])/)  // 分割并保留分隔符
    .reduce((acc, part, index, array) => {
      if (index % 2 === 0) {
        // 文本部分
        const text = part.trim();
        if (text) {
          const nextPart = array[index + 1];
          if (nextPart && /[.。!！?？]/.test(nextPart)) {
            // 如果下一部分是标点符号，则合并
            const combined = text + nextPart;
            // 恢复换行符并分割
            if (combined.includes('|LINEBREAK|')) {
              const parts = combined.split(/\s*\|\s*LINEBREAK\s*\|\s*/).filter(p => p.trim());
              acc.push(...parts);
            } else {
              acc.push(combined);
            }
          } else {
            // 如果没有标点符号，处理换行
            if (text.includes('|LINEBREAK|')) {
              const parts = text.split(/\s*\|\s*LINEBREAK\s*\|\s*/).filter(p => p.trim());
              acc.push(...parts);
            } else {
              acc.push(text);
            }
          }
        }
      }
      return acc;
    }, [] as string[])
    .filter(sentence => sentence.trim().length > 0);

  // 3. 删除每行句末的句号（但保留感叹号和问号）
  const finalSentences = sentences.map(sentence => {
    sentence = sentence.trim();
    // 只删除句号，保留感叹号和问号
    if (sentence.endsWith('。') || sentence.endsWith('.')) {
      return sentence.slice(0, -1);
    }
    return sentence;
  });

  // 合并所有句子，用换行符分隔
  return finalSentences
    .filter(sentence => sentence.length > 0)
    .join('\n');
}

/**
 * 清理多余的空白字符
 */
export function cleanWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')     // 多个空格/制表符合并为一个空格
    .replace(/\n\s*\n/g, '\n')   // 多个换行合并为一个
    .replace(/\n /g, '\n')       // 去除行首的空格
    .replace(/ \n/g, '\n')       // 去除行尾的空格
    .trim();                     // 去除首尾空白
}

/**
 * 完整的聊天响应格式化
 */
export function formatFullChatResponse(text: string): string {
  const formatted = formatChatResponse(text);
  return cleanWhitespace(formatted);
}
