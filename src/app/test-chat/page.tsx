'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Users, MessageSquare, Zap, RefreshCw, Bot, FileText, Library, Plus, AlertTriangle, User, X } from 'lucide-react';

// 类型定义
interface ChatUser {
  id: string;
  username: string;
  display_name: string;
}
interface Prompt {
  id: string;
  prompt_name: string;
}
interface TopicLibrary {
  id: string;
  library_name: string;
}
interface BotPersonality {
  id: string;
  bot_name: string;
  nationality?: string;
  age?: number;
  current_job?: string;
  hobbies?: string;
}
interface ChatSession {
  id: string;
  session_name: string;
  message_merge_seconds: number;
  topic_trigger_hours: number;
}
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'topic';
  content: string;
  created_at: string;
  is_processed: boolean;
}

// 向量搜索结果类型
interface VectorSearchResult {
  vector_id: string;
  message_id: string;
  session_id: string;
  content: string;
  vector_type: string;
  similarity: number;
  created_at: string;
  session_name: string;
  user_name: string;
  message_role: string;
}

// 创建一个通用接口来包含所有可能的选项属性
interface SelectOption {
  id: string;
  display_name?: string;
  session_name?: string;
  prompt_name?: string;
  bot_name?: string;
  library_name?: string;
  username?: string;
  name?: string;
  nationality?: string;
  age?: number;
  current_job?: string;
  hobbies?: string;
  message_merge_seconds?: number;
  topic_trigger_hours?: number;
}

export default function TestChatPage() {
  // 数据状态
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [topicLibs, setTopicLibs] = useState<TopicLibrary[]>([]);
  const [personalities, setPersonalities] = useState<BotPersonality[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // 选择状态
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [selectedPersonality, setSelectedPersonality] = useState('');
  const [selectedTopicLib, setSelectedTopicLib] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'zh' | 'vi'>('vi');
  
  // 设置状态
  const [mergeSeconds, setMergeSeconds] = useState(30); // 默认30秒
  const [topicHours, setTopicHours] = useState(24);
  const historyLimit = 10; // 使用常量值

  // 向量管理状态
  const [vectorSearchQuery, setVectorSearchQuery] = useState('');
  const [vectorSearchResults, setVectorSearchResults] = useState<VectorSearchResult[]>([]);
  const [isVectorizing, setIsVectorizing] = useState(false);

  // 前端测试界面专用的向量搜索配置
  const [testVectorConfig, setTestVectorConfig] = useState({
    similarity_threshold: 0.6,  // 前端测试页面独立的阈值
    limit: 5,                   // 前端测试页面独立的限制
    include_context: false      // 是否包含上下文向量
  });

  const [newMessage, setNewMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  const isChatDisabled = !selectedUser || !selectedSession || !selectedPrompt || !selectedPersonality || !selectedTopicLib;

  // 通用日志记录
  const addLog = useCallback((message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = isError ? '[错误]' : '[信息]';
    setLogs(prev => [...prev.slice(-99), `${prefix} [${timestamp}] ${message}`]);
  }, []);

  // 通用数据加载
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadData = useCallback(async (endpoint: string, setter: (data: any[]) => void, name: string) => {
    try {
      addLog(`正在加载 ${name}...`);
      const response = await fetch(endpoint);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const itemsKey = Object.keys(data)[0];
      const items = data[itemsKey] || [];
      setter(items);
      addLog(`加载了 ${items.length} 个${name}`);
      return items;
    } catch (error) {
      addLog(`加载${name}失败: ${error}`, true);
      setter([]); // 出错时清空
    }
  }, [addLog]);

  // 初始化加载
  useEffect(() => {
    loadData('/api/chat/users', setUsers, '用户');
    loadData('/api/prompts', setPrompts, 'Prompts');
    loadData('/api/topics', setTopicLibs, '话题库');
    loadData('/api/bot-personality', setPersonalities, '机器人人设');
  }, [loadData]);

  // 根据选择加载数据
  const loadSessions = useCallback(async (userId: string) => {
    if (!userId) {
      setSessions([]);
      setSelectedSession('');
      return;
    }
    const loadedSessions = await loadData(`/api/chat/sessions?user_id=${userId}`, setSessions, `用户会话`);
    if (loadedSessions && loadedSessions.length === 0) {
      setSelectedSession('');
    }
  }, [loadData]);

  const loadMessages = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    const data = await fetch(`/api/chat/message?session_id=${sessionId}`);
    const json = await data.json();
    if (json.messages) {
      setMessages(json.messages);
      addLog(`加载了 ${json.messages.length} 条消息`);
    }
  }, [addLog]);

  useEffect(() => {
    if (selectedUser) {
        loadSessions(selectedUser);
    }
  }, [selectedUser, loadSessions]);

  // 向量管理函数
  const loadVectorStats = useCallback(async () => {
    if (!selectedSession) {
      setVectorSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`/api/chat/vectors?session_id=${selectedSession}`);
      const data = await response.json();
      if (data.stats) {
        addLog(`向量统计: ${data.stats.total_vectors} 总计, ${data.stats.with_embedding} 已向量化`);
      }
    } catch (error) {
      addLog(`获取向量统计失败: ${error}`, true);
    }
  }, [selectedSession, addLog]);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession);
      const currentSession = sessions.find(s => s.id === selectedSession);
      if(currentSession) {
        setMergeSeconds(currentSession.message_merge_seconds);
        setTopicHours(currentSession.topic_trigger_hours);
      }
      // 加载向量统计
      loadVectorStats();
    } else {
      setMessages([]);
      setVectorSearchResults([]);
    }
  }, [selectedSession, sessions, loadMessages, loadVectorStats]);

  useEffect(() => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // API操作
  const handleCreateUser = async () => {
    try {
      addLog('正在创建用户...');
      // 生成唯一的用户名，使用时间戳确保唯一性
      const timestamp = Date.now();
      const uniqueUsername = `test_user_${timestamp}`;
      const uniqueDisplayName = `测试用户${users.length + 1}`;
      
      const response = await fetch('/api/chat/users', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          username: uniqueUsername, 
          display_name: uniqueDisplayName 
        }) 
      });
      const data = await response.json();
      if (data.user) {
        addLog(`用户创建成功: ${data.user.display_name}`);
        loadData('/api/chat/users', setUsers, '用户');
      } else throw new Error(data.error);
    } catch (error) { addLog(`创建用户失败: ${error}`, true); }
  };

  const handleCreateSession = async () => {
    if (!selectedUser) return;
    try {
      addLog('正在创建会话...');
      // 生成唯一的会话名，使用时间戳确保唯一性
      const timestamp = Date.now();
      const uniqueSessionName = `测试会话${sessions.length + 1}_${timestamp}`;
      
      const response = await fetch('/api/chat/sessions', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          user_id: selectedUser, 
          session_name: uniqueSessionName, 
          message_merge_seconds: mergeSeconds, 
          topic_trigger_hours: topicHours 
        }) 
      });
      const data = await response.json();
      if (data.session) {
        addLog(`会话创建成功: ${data.session.session_name}`);
        loadSessions(selectedUser);
      } else throw new Error(data.error);
    } catch (error) { addLog(`创建会话失败: ${error}`, true); }
  };

  // 删除用户
  const handleDeleteUser = async (userId: string, displayName: string) => {
    if (!confirm(`确定要删除用户 "${displayName}" 吗？这将会删除该用户及其所有会话的聊天数据。`)) {
      return;
    }
    
    try {
      addLog(`正在删除用户: ${displayName}...`);
      const response = await fetch(`/api/chat/users?id=${userId}`, { 
        method: 'DELETE' 
      });
      const data = await response.json();
      if (response.ok) {
        addLog(`用户删除成功: ${displayName}`);
        // 如果删除的是当前选中的用户，清空选择
        if (selectedUser === userId) {
          setSelectedUser('');
          setSelectedSession('');
          setSessions([]);
        }
        // 重新加载用户列表
        loadData('/api/chat/users', setUsers, '用户');
      } else {
        throw new Error(data.error || '删除失败');
      }
    } catch (error) { 
      addLog(`删除用户失败: ${error}`, true); 
    }
  };

  // 删除会话
  const handleDeleteSession = async (sessionId: string, sessionName: string) => {
    if (!confirm(`确定要删除会话 "${sessionName}" 吗？这将会删除该会话及其所有消息。`)) {
      return;
    }
    
    try {
      addLog(`正在删除会话: ${sessionName}...`);
      const response = await fetch(`/api/chat/sessions?id=${sessionId}`, { 
        method: 'DELETE' 
      });
      const data = await response.json();
      if (response.ok) {
        addLog(`会话删除成功: ${sessionName}`);
        // 如果删除的是当前选中的会话，清空选择
        if (selectedSession === sessionId) {
          setSelectedSession('');
          setMessages([]);
        }
        // 重新加载会话列表
        if (selectedUser) {
          loadSessions(selectedUser);
        }
      } else {
        throw new Error(data.error || '删除失败');
      }
    } catch (error) { 
      addLog(`删除会话失败: ${error}`, true); 
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isChatDisabled) return;
    try {
      const response = await fetch('/api/chat/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: selectedSession, content: newMessage, user_id: selectedUser }) });
      const data = await response.json();
      if (data.message) {
        addLog(`发送消息: "${newMessage.substring(0, 20)}..."`);
        setNewMessage('');
        loadMessages(selectedSession); // 重新加载以显示待处理消息
      } else throw new Error(data.error);
    } catch (error) { addLog(`发送消息失败: ${error}`, true); }
  };

  const handleProcessMessages = async () => {
    if (!selectedSession) return;
    setIsProcessing(true);
    addLog(`正在请求立即回复...`);
    addLog(`使用参数: 历史记录数=${historyLimit}, Prompt=${selectedPrompt}, 人设=${selectedPersonality}, 语言=${selectedLanguage === 'zh' ? '中文' : '越南文'}`);
    try {
      const response = await fetch('/api/chat/message', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSession,
          force: true,
          history_limit: historyLimit,
          prompt_id: selectedPrompt,
          personality_id: selectedPersonality,
          language: selectedLanguage
        })
      });
      const data = await response.json();
      if (data.success) {
        addLog(`AI回复生成成功，处理了 ${data.processedCount} 条消息`);
        if (data.knowledgeUsed) {
          addLog(`使用了知识库匹配内容`);
        }
        loadMessages(selectedSession);
      } else {
        if (data.waitTime) {
          addLog(`需要等待 ${data.waitTime} 秒后再次尝试`, true);
        } else {
          throw new Error(data.error || data.message);
        }
      }
    } catch (error) {
      addLog(`生成回复失败: ${error}`, true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendTopic = async () => {
    if (!selectedSession || !selectedTopicLib) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/chat/trigger-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSession,
          topic_category_id: selectedTopicLib
        })
      });
      const data = await response.json();
      if (data.success) {
        addLog(`话题发送成功`);
        loadMessages(selectedSession);
      } else throw new Error(data.error);
    } catch (error) {
      addLog(`发送话题失败: ${error}`, true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchVectorize = async () => {
    if (!selectedSession) return;
    setIsVectorizing(true);
    try {
      const response = await fetch('/api/chat/vectors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSession,
          batch_size: 10
        })
      });
      const data = await response.json();
      if (data.success) {
        addLog(`向量化完成: 处理了 ${data.updated_count} 条记录`);
        loadVectorStats();
      } else throw new Error(data.error);
    } catch (error) {
      addLog(`向量化失败: ${error}`, true);
    } finally {
      setIsVectorizing(false);
    }
  };

  const handleVectorSearch = async () => {
    if (!selectedSession || !vectorSearchQuery.trim()) return;
    try {
      const response = await fetch('/api/chat/vectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSession,
          query: vectorSearchQuery,
          similarity_threshold: testVectorConfig.similarity_threshold,
          limit: testVectorConfig.limit,
          include_context: testVectorConfig.include_context
        })
      });
      const data = await response.json();
      if (data.success) {
        setVectorSearchResults(data.results);
        addLog(`向量搜索完成: 找到 ${data.results.length} 条结果`);
        data.results.forEach((result: VectorSearchResult) => {
          const similarity = (result.similarity * 100).toFixed(1);
          const content = result.content.substring(0, 80); // 显示更多字符
          addLog(`  ${similarity}% ${content}${result.content.length > 80 ? '...' : ''}`);
        });
      } else throw new Error(data.error);
    } catch (error) {
      addLog(`向量搜索失败: ${error}`, true);
      setVectorSearchResults([]);
    }
  };

  const buttonClass = "p-2 text-white rounded-md transition-colors";
  const coloredButtonClass = `${buttonClass} disabled:opacity-50 disabled:cursor-not-allowed`;
  const selectClass = "w-full p-2 border rounded-md dark:bg-[var(--component-background)] dark:border-[var(--border-color)] disabled:opacity-50 disabled:cursor-not-allowed";

  // 自定义下拉框组件，支持选项内删除按钮
  const CustomSelectWithOptionDelete = ({ 
    value, 
    onChange, 
    options, 
    placeholder, 
    onDelete, 
    disabled = false, 
    className = "",
    deleteTitle = "删除"
  }: {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder: string;
    onDelete?: (id: string, name: string) => void;
    disabled?: boolean;
    className?: string;
    deleteTitle?: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(opt => opt.id === value);
    const selectedName = selectedOption?.display_name || selectedOption?.session_name || selectedOption?.prompt_name || selectedOption?.bot_name || selectedOption?.library_name || selectedOption?.name || '未命名';

    return (
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`${selectClass} ${className} text-left flex items-center justify-between`}
        >
          <span className={selectedName ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
            {selectedName || placeholder}
          </span>
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && !disabled && (
          <>
            {/* 背景遮罩 */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            {/* 下拉选项 */}
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-[var(--component-background)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-full w-max">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                  暂无选项
                </div>
              ) : (
                options.map((option) => {
                  const displayName = option.display_name || option.session_name || option.prompt_name || option.bot_name || option.library_name || option.name || '未命名';
                  return (
                    <div
                      key={option.id}
                      className={`group flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-[var(--accent-background)] transition-colors duration-150 whitespace-nowrap ${
                        value === option.id 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onChange(option.id);
                          setIsOpen(false);
                        }}
                        className={`text-left ${onDelete ? 'flex-1 pr-2' : 'w-full'}`}
                        title={displayName}
                      >
                        {displayName}
                      </button>
                      {onDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            onDelete(option.id, displayName);
                          }}
                          className="flex-shrink-0 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title={deleteTitle}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-[var(--background)] text-gray-900 dark:text-white">
      <div className="container mx-auto p-4 h-full">
        <h1 className="text-2xl font-bold mb-4">聊天机器人测试面板</h1>

        {/* 设置栏 */}
        <div className="bg-white dark:bg-[var(--component-background)] rounded-lg p-4 mb-4 shadow-md border border-gray-200 dark:border-[var(--border-color)]">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end">
            {/* 用户选择 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 flex items-center text-gray-700 dark:text-gray-300">
                <Users className="w-4 h-4 mr-1"/>用户
              </label>
              <div className="flex">
                <CustomSelectWithOptionDelete
                  value={selectedUser}
                  onChange={setSelectedUser}
                  options={users}
                  placeholder="选择用户"
                  onDelete={handleDeleteUser}
                  deleteTitle="删除用户"
                  className="rounded-r-none"
                />
                <button 
                  onClick={handleCreateUser} 
                  className={`${coloredButtonClass} bg-blue-500 hover:bg-blue-600 rounded-l-none`}
                >
                  <Plus className="w-4 h-4"/>
                </button>
              </div>
            </div>

             {/* 会话选择 */}
             <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 flex items-center text-gray-700 dark:text-gray-300">
                <MessageSquare className="w-4 h-4 mr-1"/>会话
              </label>
              <div className="flex">
                <CustomSelectWithOptionDelete
                  value={selectedSession}
                  onChange={setSelectedSession}
                  options={sessions}
                  placeholder="选择会话"
                  onDelete={handleDeleteSession}
                  deleteTitle="删除会话"
                  disabled={!selectedUser}
                  className="rounded-r-none"
                />
                <button 
                  onClick={handleCreateSession} 
                  disabled={!selectedUser} 
                  className={`${coloredButtonClass} bg-green-500 hover:bg-green-600 rounded-l-none`}
                >
                  <Plus className="w-4 h-4"/>
                </button>
              </div>
            </div>
            
            {/* Prompt选择 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 flex items-center text-gray-700 dark:text-gray-300">
                <FileText className="w-4 h-4 mr-1"/>Prompt
              </label>
              <CustomSelectWithOptionDelete
                value={selectedPrompt}
                onChange={setSelectedPrompt}
                options={prompts}
                placeholder="选择Prompt"
              />
            </div>

            {/* 人设选择 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 flex items-center text-gray-700 dark:text-gray-300">
                <User className="w-4 h-4 mr-1"/>人设
              </label>
              <CustomSelectWithOptionDelete
                value={selectedPersonality}
                onChange={setSelectedPersonality}
                options={personalities}
                placeholder="选择人设"
              />
            </div>

            {/* 话题库选择 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 flex items-center text-gray-700 dark:text-gray-300">
                <Library className="w-4 h-4 mr-1"/>话题库
              </label>
              <CustomSelectWithOptionDelete
                value={selectedTopicLib}
                onChange={setSelectedTopicLib}
                options={topicLibs}
                placeholder="选择话题库"
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col justify-end lg:col-span-2">
                {/* 添加空的label以匹配其他选项的高度结构 */}
                <div className="text-sm font-semibold mb-1 opacity-0">操作</div>
                <div className="flex gap-2">
                    <button onClick={handleSendTopic} disabled={!selectedSession || !selectedTopicLib || isProcessing} className={`${coloredButtonClass} bg-blue-500 hover:bg-blue-600 flex-grow flex items-center justify-center`}>
                        <Zap className="w-4 h-4 mr-1"/>{isProcessing ? "发送中..." : "发起话题"}
                    </button>
                    <button onClick={handleProcessMessages} disabled={!selectedSession || isProcessing} className={`${coloredButtonClass} bg-orange-500 hover:bg-orange-600 flex-grow flex items-center justify-center`}>
                        <RefreshCw className="w-4 h-4 mr-1"/>{isProcessing ? "处理中..." : "生成回复"}
                    </button>
                </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧：操作 */}
          <div className="flex flex-col gap-4">
            
            {/* 向量管理面板 */}
            <div className="bg-white dark:bg-[var(--component-background)] rounded-lg p-4 shadow-md border border-gray-200 dark:border-[var(--border-color)]">
              <h3 className="font-semibold mb-2 flex items-center text-gray-900 dark:text-gray-100">
                <Zap className="w-4 h-4 mr-1"/>聊天记录向量管理
              </h3>
              
              <div className="space-y-3">
                {/* 向量化操作 */}
                <div className="flex gap-2">
                  <button 
                    onClick={handleBatchVectorize} 
                    disabled={!selectedSession || isVectorizing}
                    className={`${coloredButtonClass} bg-purple-500 hover:bg-purple-600 flex-1 text-sm`}
                  >
                    {isVectorizing ? "向量化中..." : "批量向量化"}
                  </button>
                </div>
                
                {/* 向量搜索参数配置 */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">相似度阈值</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="1"
                      value={testVectorConfig.similarity_threshold}
                      onChange={e => setTestVectorConfig(prev => ({ ...prev, similarity_threshold: Number(e.target.value) }))}
                      className="w-full p-1 border rounded text-xs dark:bg-[var(--component-background)] dark:border-[var(--border-color)] dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">结果数量</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="20"
                      value={testVectorConfig.limit}
                      onChange={e => setTestVectorConfig(prev => ({ ...prev, limit: Number(e.target.value) }))}
                      className="w-full p-1 border rounded text-xs dark:bg-[var(--component-background)] dark:border-[var(--border-color)] dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* 向量搜索 */}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={vectorSearchQuery}
                    onChange={e => setVectorSearchQuery(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleVectorSearch()}
                    placeholder="搜索相似聊天..."
                    disabled={!selectedSession}
                    className="flex-1 p-2 border rounded text-sm dark:bg-[var(--component-background)] dark:border-[var(--border-color)] dark:text-gray-100 disabled:opacity-50"
                  />
                  <button 
                    onClick={handleVectorSearch}
                    disabled={!selectedSession || !vectorSearchQuery.trim()}
                    className={`${coloredButtonClass} bg-blue-500 hover:bg-blue-600 text-sm px-4`}
                  >
                    搜索
                  </button>
                </div>

                {/* 向量搜索结果显示 */}
                {vectorSearchResults.length > 0 && (
                  <div className="mt-3 p-2 bg-gray-50 dark:bg-[var(--accent-background)] rounded text-xs border border-gray-200 dark:border-[var(--border-color)]">
                    <div className="font-medium mb-2 text-gray-900 dark:text-gray-100">搜索结果 ({vectorSearchResults.length} 条):</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {vectorSearchResults.slice(0, 3).map((result) => (
                        <div key={result.vector_id} className="p-1 bg-white dark:bg-[var(--component-background)] rounded border border-gray-200 dark:border-[var(--border-color)]">
                          <div className="font-medium text-blue-600 dark:text-blue-400">
                            相似度: {(result.similarity * 100).toFixed(1)}%
                          </div>
                          <div className="text-gray-600 dark:text-gray-300 truncate">
                            {result.content.substring(0, 60)}...
                          </div>
                        </div>
                      ))}
                      {vectorSearchResults.length > 3 && (
                        <div className="text-gray-500 dark:text-gray-400 text-center">
                          ...还有 {vectorSearchResults.length - 3} 条结果
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[var(--component-background)] rounded-lg p-4 shadow-md flex-grow border border-gray-200 dark:border-[var(--border-color)]">
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">操作日志</h3>
              <div ref={logContainerRef} className="h-60 overflow-y-auto text-xs font-mono bg-gray-100 dark:bg-[var(--accent-background)] p-2 rounded min-h-0 border border-gray-200 dark:border-[var(--border-color)]">
                {logs.map((log, i) => <p key={i} className={log.startsWith('[错误]') ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}>{log}</p>)}
              </div>
            </div>
          </div>
          
          {/* 右侧：聊天窗口 */}
          <div className={`lg:col-span-2 bg-white dark:bg-[var(--component-background)] rounded-lg shadow-md flex flex-col h-[70vh] transition-opacity duration-300 border border-gray-200 dark:border-[var(--border-color)] ${isChatDisabled ? 'opacity-50' : ''}`}>
            <div className="p-4 border-b border-gray-200 dark:border-[var(--border-color)] flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">聊天窗口</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">语言选择:</span>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="language"
                      value="zh"
                      checked={selectedLanguage === 'zh'}
                      onChange={(e) => setSelectedLanguage(e.target.value as 'zh' | 'vi')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">中文对话</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="language"
                      value="vi"
                      checked={selectedLanguage === 'vi'}
                      onChange={(e) => setSelectedLanguage(e.target.value as 'zh' | 'vi')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Hội thoại tiếng Việt（越南文对话）</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <AlertTriangle className="w-12 h-12 mb-4"/>
                    <p>请在顶部选择 用户、会话、Prompt、人设 和 话题库 以开始聊天</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id}>
                  <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {(msg.role === 'assistant' || msg.role === 'topic') && <Bot className="w-6 h-6 text-blue-500"/>}
                    <div className={`max-w-xl px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-[var(--accent-background)] text-gray-900 dark:text-gray-100'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div className="text-xs opacity-70 mt-1 text-right">
                        {new Date(msg.created_at).toLocaleTimeString()}
                        {!msg.is_processed && msg.role === 'user' && ' ⏳'}
                        {msg.role === 'topic' && ' 🎯'}
                      </div>
                    </div>
                    {msg.role === 'user' && <Users className="w-6 h-6 text-green-500"/>}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-[var(--border-color)]">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()} 
                  placeholder={isChatDisabled ? "请先完成顶部设置" : "输入消息..."} 
                  disabled={isChatDisabled} 
                  className="w-full p-2 border rounded-md dark:bg-[var(--component-background)] dark:border-[var(--border-color)] dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button 
                  onClick={handleSendMessage} 
                  disabled={isChatDisabled || !newMessage.trim()} 
                  className={`${coloredButtonClass} bg-blue-500 hover:bg-blue-600`}
                >
                  <Send className="w-5 h-5"/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 