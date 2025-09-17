/**
 * @fileoverview
 * 统一的错误处理模块。
 * 提供一个标准的函数来记录应用程序中的错误，以便于调试和监控。
 */

/**
 * 处理和记录应用程序中发生的错误。
 * @param {unknown} error - 捕获到的错误对象。
 * @param {Record<string, any>} context - 发生错误时的附加上下文信息。
 */
export function handleError(error: unknown, context: Record<string, any> = {}) {
  const message = error instanceof Error ? error.message : 'An unknown error occurred';
  
  // 使用 structured logging，方便后续接入日志服务
  console.error(
    JSON.stringify(
      {
        level: 'error',
        message,
        context,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? { name: error.name, stack: error.stack } : JSON.stringify(error),
      },
      null,
      2
    )
  );
}
