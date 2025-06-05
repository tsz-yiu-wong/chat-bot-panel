'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, Bot, Tag, Filter } from 'lucide-react'

// 模拟数据
const mockPrompts = [
  {
    prompt_id: '1',
    model_id: 'qwen3-32B',
    model_name: 'qwen3-32B',
    stage_name: 'first_meet',
    prompt_text_template: {
      chinese: '你好！我叫{{bot_name}}，请问怎么称呼你呢？',
      vietnamese: 'Xin chào! Rất vui được làm quen với bạn. Tôi tên là {{bot_name}}, tôi có thể gọi bạn là gì?'
    },
    conditions: { user_tags: ['new_user'] },
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T15:30:00Z'
  },
  {
    prompt_id: '2',
    model_id: 'qwen3-32B',
    model_name: 'qwen3-32B',
    stage_name: 'learn_hobbies',
    prompt_text_template: {
      chinese: '我想更了解你一些，能告诉我你平时喜欢做什么吗？有什么兴趣爱好呢？',
      vietnamese: 'Tôi muốn hiểu bạn hơn một chút, bạn có thể cho tôi biết bạn thường thích làm gì không? Sở thích của bạn là gì?'
    },
    conditions: { user_tags: ['interested'] },
    created_at: '2024-01-14T09:00:00Z',
    updated_at: '2024-01-19T14:00:00Z'
  },
  {
    prompt_id: '3',
    model_id: 'gemma3-27B',
    model_name: 'gemma3-27B',
    stage_name: 'show_ability',
    prompt_text_template: {
      chinese: '我很擅长{{skill}}，也很喜欢帮助别人。如果你有相关需要，我很乐意为你提供帮助。',
      vietnamese: 'Tôi rất giỏi {{skill}} và cũng rất thích giúp đỡ người khác. Nếu bạn có nhu cầu liên quan, tôi rất sẵn lòng giúp bạn.'
    },
    conditions: { user_tags: ['technical_user'] },
    created_at: '2024-01-12T11:00:00Z',
    updated_at: '2024-01-18T16:00:00Z'
  },
  {
    prompt_id: '4',
    model_id: 'gemma3-27B',
    model_name: 'gemma3-27B',
    stage_name: 'romance',
    prompt_text_template: {
      chinese: '和你聊天总是让我感到很开心，你就像是照亮我生活的那道光。',
      vietnamese: 'Trò chuyện với bạn luôn khiến tôi cảm thấy rất vui, bạn như ánh sáng chiếu sáng cuộc sống của tôi.'
    },
    conditions: {},
    created_at: '2024-01-10T13:00:00Z',
    updated_at: '2024-01-17T10:00:00Z'
  }
]

const stageOptions = [
  { value: 'first_meet', label: '刚认识', color: 'blue' },
  { value: 'learn_hobbies', label: '了解爱好', color: 'green' },
  { value: 'show_ability', label: '展示能力', color: 'purple' },
  { value: 'romance', label: '恋爱', color: 'pink' }
]

export default function PromptsPage() {
  const prompts = mockPrompts
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedStage, setSelectedStage] = useState('all')
  const [selectedModel, setSelectedModel] = useState('all')

  const filteredPrompts = prompts.filter(prompt => {
    const stageMatch = selectedStage === 'all' || prompt.stage_name === selectedStage
    const modelMatch = selectedModel === 'all' || prompt.model_id === selectedModel
    return stageMatch && modelMatch
  })

  const getStageColor = (stageName: string) => {
    const stage = stageOptions.find(s => s.value === stageName)
    return stage?.color || 'gray'
  }

  const getStageLabel = (stageName: string) => {
    const stage = stageOptions.find(s => s.value === stageName)
    return stage?.label || stageName
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">提示词管理</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">管理不同阶段和场景的提示词模板</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>创建提示词</span>
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stageOptions.map((stage) => (
          <div key={stage.value} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stage.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {prompts.filter(p => p.stage_name === stage.value).length}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                stage.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/30' :
                stage.color === 'green' ? 'bg-green-50 dark:bg-green-900/30' :
                stage.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/30' :
                stage.color === 'pink' ? 'bg-pink-50 dark:bg-pink-900/30' :
                'bg-gray-50 dark:bg-gray-700'
              }`}>
                <Tag className={`w-6 h-6 ${
                  stage.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                  stage.color === 'green' ? 'text-green-600 dark:text-green-400' :
                  stage.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                  stage.color === 'pink' ? 'text-pink-600 dark:text-pink-400' :
                  'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选器 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">阶段：</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">全部</option>
              {stageOptions.map(stage => (
                <option key={stage.value} value={stage.value}>{stage.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">模型：</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">全部</option>
              <option value="qwen3-32B">qwen3-32B</option>
              <option value="gemma3-27B">gemma3-27B</option>
            </select>
          </div>
        </div>
      </div>

      {/* 提示词列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            提示词列表 ({filteredPrompts.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredPrompts.map((prompt) => (
            <div key={prompt.prompt_id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      getStageColor(prompt.stage_name) === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' :
                      getStageColor(prompt.stage_name) === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                      getStageColor(prompt.stage_name) === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400' :
                      getStageColor(prompt.stage_name) === 'pink' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-400' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {getStageLabel(prompt.stage_name)}
                    </span>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Bot className="w-4 h-4" />
                      <span>{prompt.model_name}</span>
                    </div>
                  </div>
                  
                  {/* 中文版本 */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">中文</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
                        {prompt.prompt_text_template.chinese}
                      </p>
                    </div>
                  </div>

                  {/* 越南文版本 */}
                  <div className="mb-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Tiếng Việt</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
                        {prompt.prompt_text_template.vietnamese}
                      </p>
                    </div>
                  </div>

                  {Object.keys(prompt.conditions).length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        条件: {JSON.stringify(prompt.conditions)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 创建提示词模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">创建新提示词</h3>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    关联模型
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option value="qwen3-32B">qwen3-32B</option>
                    <option value="gemma3-27B">gemma3-27B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    聊天阶段
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    {stageOptions.map(stage => (
                      <option key={stage.value} value={stage.value}>{stage.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  中文提示词模板
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="输入中文提示词模板，可以使用 {{变量名}} 作为占位符"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  越南语提示词模板
                </label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Nhập mẫu prompt tiếng Việt, có thể sử dụng {{tên_biến}} làm placeholder"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  可用变量: &#123;&#123;bot_name&#125;&#125;, &#123;&#123;user_name&#125;&#125;, &#123;&#123;user_tags&#125;&#125;, &#123;&#123;context&#125;&#125;
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  使用条件 (JSON格式)
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder='{"user_tags": ["vip_user"], "time_of_day": "morning"}'
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  定义此提示词的使用条件，留空表示无条件使用
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 