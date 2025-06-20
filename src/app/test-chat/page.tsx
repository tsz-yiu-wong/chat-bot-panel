'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Users, MessageSquare, Clock, Zap, RefreshCw, Bot, FileText, Library, Plus, AlertTriangle, User } from 'lucide-react';

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
  const [historyLimit, setHistoryLimit] = useState(10);

  const [newMessage, setNewMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isChatDisabled = !selectedUser || !selectedSession || !selectedPrompt || !selectedPersonality || !selectedTopicLib;

  // 通用日志记录
  const addLog = useCallback((message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = isError ? '[错误]' : '[信息]';
    setLogs(prev => [`${prefix} [${timestamp}] ${message}`, ...prev].slice(0, 100));
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

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession);
      const currentSession = sessions.find(s => s.id === selectedSession);
      if(currentSession) {
        setMergeSeconds(currentSession.message_merge_seconds);
        setTopicHours(currentSession.topic_trigger_hours);
      }
    } else {
      setMessages([]);
    }
  }, [selectedSession, sessions, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // API操作
  const handleCreateUser = async () => {
    const username = prompt('输入新用户名:');
    if (!username) return;
    try {
      const response = await fetch('/api/chat/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, display_name: username }) });
      const data = await response.json();
      if (data.user) {
        addLog(`创建用户成功: ${data.user.username}`);
        loadData('/api/chat/users', setUsers, '用户');
      } else throw new Error(data.error);
    } catch (error) { addLog(`创建用户失败: ${error}`, true); }
  };

  const handleCreateSession = async () => {
    if (!selectedUser) { alert('请先选择用户'); return; }
    const sessionName = prompt('输入会话名称:') || '新对话';
    try {
      addLog('正在创建会话...');
      const response = await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: selectedUser, session_name: sessionName }) });
      const data = await response.json();
      if (data.session) {
        addLog(`创建会话成功: ${data.session.session_name}`);
        await loadSessions(selectedUser);
        setSelectedSession(data.session.id);
      } else throw new Error(data.error);
    } catch (error) { addLog(`创建会话失败: ${error}`, true); }
  };

  const handleUpdateSessionSettings = async (type: 'merge' | 'topic') => {
    if (!selectedSession) return;
    const body = type === 'merge' 
        ? { message_merge_seconds: mergeSeconds } 
        : { topic_trigger_hours: topicHours };
    try {
        addLog(`正在更新会话设置...`);
        const response = await fetch(`/api/chat/sessions/${selectedSession}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await response.json();
        if (data.session) {
            addLog(`更新成功: ${type === 'merge' ? `延迟回复时间设置为 ${mergeSeconds}s` : `话题等待时间设置为 ${topicHours}h`}`);
            setSessions(sessions.map(s => s.id === selectedSession ? { ...s, ...body } : s));
        } else throw new Error(data.error);
    } catch (error) { addLog(`更新会话设置失败: ${error}`, true); }
  }
  
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
        addLog(`处理成功，收到AI回复: "${data.aiMessage?.content?.substring(0, 30)}..."`);
        
        // 显示向量检索信息
        const metadata = data.aiMessage?.metadata;
        if (metadata) {
          if (metadata.knowledge_results_count > 0) {
            addLog(`🔍 找到 ${metadata.knowledge_results_count} 条相关知识，最高相似度: ${metadata.knowledge_max_similarity?.toFixed(3)}`);
            if (metadata.knowledge_max_similarity >= 0.8) {
              addLog(`✅ 使用高相似度话术回复 (${metadata.knowledge_max_similarity?.toFixed(3)})`);
            } else if (metadata.knowledge_max_similarity >= 0.6) {
              addLog(`📋 使用话术库参考回复 (${metadata.knowledge_max_similarity?.toFixed(3)})`);
            } else {
              addLog(`💡 参考低相似度知识 (${metadata.knowledge_max_similarity?.toFixed(3)})`);
            }
          } else {
            addLog(`❌ 未找到相关知识库内容`);
          }
          
          // 显示人设匹配信息
          if (metadata.personality_similarity) {
            addLog(`🎭 人设匹配度: ${metadata.personality_similarity?.toFixed(3)}`);
          }
          
          // 显示缩写识别信息
          if (metadata.abbreviations_found > 0) {
            addLog(`🔤 识别到 ${metadata.abbreviations_found} 个缩写`);
          }
        }
        
        if (data.knowledgeUsed) {
          addLog(`✅ 使用了知识库内容进行回复`);
        } else {
          addLog(`ℹ️ 未找到相关知识库内容，使用一般知识回复`);
        }
        addLog(`处理了 ${data.processedCount} 条消息`);
        loadMessages(selectedSession);
      } else {
        addLog(`处理失败: ${data.message || data.error}`, true);
      }
    } catch (error) { addLog(`处理消息失败: ${error}`, true); }
    finally { setIsProcessing(false); }
  };

  const handleSendTopic = async () => {
    if (!selectedSession || !selectedTopicLib) return;
    setIsProcessing(true);
    addLog(`正在请求立即发送话题...`);
    try {
      const response = await fetch('/api/chat/trigger-topic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: selectedSession, topic_category_id: selectedTopicLib }) });
      const data = await response.json();
      if (data.success) {
        addLog(`话题发送成功: ${data.message.content}`);
        loadMessages(selectedSession);
      } else throw new Error(data.error);
    } catch (error) { addLog(`发送话题失败: ${error}`, true); }
    finally { setIsProcessing(false); }
  }

  const buttonClass = "p-2 text-white rounded-md transition-colors";
  const coloredButtonClass = `${buttonClass} disabled:opacity-50 disabled:cursor-not-allowed`;
  const selectClass = "w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="container mx-auto p-4 h-full">
        <h1 className="text-2xl font-bold mb-4">聊天机器人测试面板</h1>

        {/* 设置栏 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
            {/* 用户选择 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 flex items-center"><Users className="w-4 h-4 mr-1"/>用户</label>
              <div className="flex">
                <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full p-2 border rounded-l-md dark:bg-gray-700 dark:border-gray-600">
                  <option value="">选择用户</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
                </select>
                <button onClick={handleCreateUser} className={`${coloredButtonClass} bg-blue-500 hover:bg-blue-600 rounded-l-none`}><Plus className="w-4 h-4"/></button>
              </div>
            </div>

             {/* 会话选择 */}
             <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 flex items-center"><MessageSquare className="w-4 h-4 mr-1"/>会话</label>
              <div className="flex">
                <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)} disabled={!selectedUser} className="w-full p-2 border rounded-l-md dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  <option value="">选择会话</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.session_name}</option>)}
                </select>
                <button onClick={handleCreateSession} disabled={!selectedUser} className={`${coloredButtonClass} bg-green-500 hover:bg-green-600 rounded-l-none`}><Plus className="w-4 h-4"/></button>
              </div>
            </div>
            
            {/* Prompt选择 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 flex items-center"><FileText className="w-4 h-4 mr-1"/>Prompt</label>
              <select value={selectedPrompt} onChange={e => setSelectedPrompt(e.target.value)} className={selectClass}>
                <option value="">选择Prompt</option>
                {prompts.map(p => <option key={p.id} value={p.id}>{p.prompt_name}</option>)}
              </select>
            </div>

            {/* 人设选择 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 flex items-center"><User className="w-4 h-4 mr-1"/>人设</label>
              <select value={selectedPersonality} onChange={e => setSelectedPersonality(e.target.value)} className={selectClass}>
                <option value="">选择人设</option>
                {personalities.map(p => <option key={p.id} value={p.id}>{p.bot_name}</option>)}
              </select>
            </div>

            {/* 话题库选择 */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-1 flex items-center"><Library className="w-4 h-4 mr-1"/>话题库</label>
              <select value={selectedTopicLib} onChange={e => setSelectedTopicLib(e.target.value)} className={selectClass}>
                <option value="">选择话题库</option>
                {topicLibs.map(t => <option key={t.id} value={t.id}>{t.library_name}</option>)}
              </select>
            </div>

            {/* 历史记录数 */}
            <div className="flex flex-col">
                <label className="text-sm font-semibold mb-1">历史记录数</label>
                <input type="number" step="1" min="0" value={historyLimit} onChange={e => setHistoryLimit(Number(e.target.value))} className={`${selectClass} w-full`}/>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧：操作 */}
          <div className="flex flex-col gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
              <h3 className="font-semibold mb-2 flex items-center"><Clock className="w-4 h-4 mr-1"/>延迟回复等待时间</h3>
              <div className="flex items-center gap-2">
                <input type="number" value={mergeSeconds} onChange={e => setMergeSeconds(Number(e.target.value))} disabled={!selectedSession} className="w-20 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"/>
                <span className="text-sm">秒</span>
                <button onClick={() => handleUpdateSessionSettings('merge')} disabled={!selectedSession} className={`${coloredButtonClass} bg-gray-500 hover:bg-gray-600 px-3`}>保存</button>
                <button onClick={handleProcessMessages} disabled={!selectedSession || isProcessing} className={`${coloredButtonClass} bg-orange-500 hover:bg-orange-600 flex-grow flex items-center justify-center`}>
                  <RefreshCw className="w-4 h-4 mr-1"/>{isProcessing ? "处理中..." : "立即回复"}
                </button>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
              <h3 className="font-semibold mb-2 flex items-center"><Zap className="w-4 h-4 mr-1"/>主动发送话题等待时间</h3>
              <div className="flex items-center gap-2">
                <input type="number" value={topicHours} onChange={e => setTopicHours(Number(e.target.value))} disabled={!selectedSession} className="w-20 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"/>
                <span className="text-sm">小时</span>
                <button onClick={() => handleUpdateSessionSettings('topic')} disabled={!selectedSession} className={`${coloredButtonClass} bg-gray-500 hover:bg-gray-600 px-3`}>保存</button>
                <button onClick={handleSendTopic} disabled={!selectedSession || !selectedTopicLib || isProcessing} className={`${coloredButtonClass} bg-blue-500 hover:bg-blue-600 flex-grow flex items-center justify-center`}>
                  <Zap className="w-4 h-4 mr-1"/>{isProcessing ? "发送中..." : "立即发送话题"}
                </button>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md flex-grow">
              <h3 className="font-semibold mb-2">操作日志</h3>
              <div className="h-56 overflow-y-auto text-xs font-mono bg-gray-100 dark:bg-gray-900 p-2 rounded">
                {logs.map((log, i) => <p key={i} className={log.startsWith('[错误]') ? 'text-red-500' : ''}>{log}</p>)}
              </div>
            </div>
          </div>
          
          {/* 右侧：聊天窗口 */}
          <div className={`lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col h-[70vh] transition-opacity duration-300 ${isChatDisabled ? 'opacity-50' : ''}`}>
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold">聊天窗口</h3>
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
                    <span className="text-sm">中文对话</span>
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
                    <span className="text-sm">Hội thoại tiếng Việt（越南文对话）</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <AlertTriangle className="w-12 h-12 mb-4"/>
                    <p>请在顶部选择 用户、会话、Prompt、人设 和 话题库 以开始聊天</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id}>
                  {msg.role === 'topic' ? (
                     <div className="text-center my-2">
                        <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">{msg.content}</span>
                     </div>
                  ) : (
                    <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && <Bot className="w-6 h-6 text-blue-500"/>}
                      <div className={`max-w-xl px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className="text-xs opacity-70 mt-1 text-right">
                          {new Date(msg.created_at).toLocaleTimeString()}
                          {!msg.is_processed && msg.role === 'user' && ' ⏳'}
                        </div>
                      </div>
                      {msg.role === 'user' && <Users className="w-6 h-6 text-green-500"/>}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t dark:border-gray-700">
              <div className="flex gap-2">
                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder={isChatDisabled ? "请先完成顶部设置" : "输入消息..."} disabled={isChatDisabled} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"/>
                <button onClick={handleSendMessage} disabled={isChatDisabled || !newMessage.trim()} className={`${coloredButtonClass} bg-blue-500 hover:bg-blue-600`}><Send className="w-5 h-5"/></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 