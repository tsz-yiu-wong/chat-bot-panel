'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Edit, Trash2, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

import { TopicCategory, TopicSubcategory, Topic } from './page';
import { 
  getHydrationSafeCategoryDisplayName, 
  getHydrationSafeSubcategoryDisplayName, 
  filterTopics 
} from './utils';
import { deleteTopic } from './actions';
import { ManageCategoriesDialog } from './dialog-manage-categories';
import { AddTopicDialog } from './dialog-add-topic';
import { EditTopicDialog } from './dialog-edit-topic';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { useUser } from '@/components/user-context';
import { hasOperationPermission } from '@/lib/permissions';

interface TopicsListProps {
  initialCategories: TopicCategory[];
  initialSubcategories: TopicSubcategory[];
  initialTopics: Topic[];
}

export function TopicsList({ 
  initialCategories, 
  initialSubcategories, 
  initialTopics 
}: TopicsListProps) {
  // 使用hydration-safe翻译，避免hydration不匹配
  const { t, isMounted, currentLanguage } = useHydrationSafeTranslation();
  
  // 获取用户权限
  const { userRole } = useUser();
  const { addToast } = useToast();
  const canEdit = userRole ? hasOperationPermission(userRole, 'edit') : false;
  const canDelete = userRole ? hasOperationPermission(userRole, 'delete') : false;

  // 状态管理
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState<boolean>(false);
  const [addTopicOpen, setAddTopicOpen] = useState<boolean>(false);
  const [editTopicOpen, setEditTopicOpen] = useState<boolean>(false);
  const [deleteTopicOpen, setDeleteTopicOpen] = useState<boolean>(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // 根据选中的 Category 筛选 Subcategories
  const filteredSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return initialSubcategories.filter(sub => sub.category_id === selectedCategoryId);
  }, [initialSubcategories, selectedCategoryId]);

  // 全局搜索结果（不受分类筛选影响）
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filterTopics(initialTopics, null, null, searchQuery).slice(0, 10); // 最多显示10个结果
  }, [initialTopics, searchQuery]);

  // 根据分类筛选的 Topics（不含搜索）
  const filteredTopics = useMemo(() => {
    return filterTopics(initialTopics, selectedCategoryId, selectedSubcategoryId, '');
  }, [initialTopics, selectedCategoryId, selectedSubcategoryId]);

  // 处理 Category 选中
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(null); // 重置子分类选择
    // 清空搜索
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // 处理 Subcategory 选中
  const handleSubcategorySelect = (subcategoryId: string) => {
    setSelectedSubcategoryId(subcategoryId);
    // 清空搜索
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(value.trim().length > 0);
  };

  // 处理搜索结果点击
  const handleSearchResultClick = (topic: Topic) => {
    // 设置选中的分类和子分类
    if (topic.category_id) {
      setSelectedCategoryId(topic.category_id);
    }
    if (topic.subcategory_id) {
      setSelectedSubcategoryId(topic.subcategory_id);
    }
    // 清空搜索
    setSearchQuery('');
    setShowSearchResults(false);

    // 滚动到对应的分类、子分类和topic
    setTimeout(() => {
      // 滚动到分类
      if (topic.category_id) {
        const categoryElement = document.getElementById(`category-${topic.category_id}`);
        if (categoryElement) {
          categoryElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      
      // 滚动到子分类
      if (topic.subcategory_id) {
        const subcategoryElement = document.getElementById(`subcategory-${topic.subcategory_id}`);
        if (subcategoryElement) {
          subcategoryElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      
      // 滚动到topic
      const topicElement = document.getElementById(`topic-${topic.id}`);
      if (topicElement) {
        topicElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // 处理编辑
  const handleEdit = (topic: Topic) => {
    setSelectedTopic(topic);
    setEditTopicOpen(true);
  };

  // 处理删除
  const handleDelete = (topic: Topic) => {
    setSelectedTopic(topic);
    setDeleteTopicOpen(true);
  };

  // 获取删除确认文本
  const getDeleteText = () => {
    if (!selectedTopic) return '';
    return t('common.actions.delete_confirm', { 
      type: t('topics.module_name'), 
      name: selectedTopic.content.substring(0, 30) + (selectedTopic.content.length > 30 ? '...' : '')
    });
  };

  // 执行删除
  const executeDelete = async () => {
    if (!selectedTopic) return;

    const result = await deleteTopic(selectedTopic.id);

    if (result.success) {
      addToast('success', t('common.messages.delete_success'));
      setDeleteTopicOpen(false);
      setSelectedTopic(null);
    } else {
      addToast('error', result.error || t('common.messages.delete_failed'));
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>
      {/* 页面标题和添加按钮 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('common.titles.management', { module: t('topics.module_name') })}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManageCategoriesOpen(true)}>
            <Settings className="h-4 w-4" />
            {t('common.patterns.manage_items', { items: t('topics.categories_name') })}
          </Button>
          <Button className="text-white" onClick={() => setAddTopicOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('common.patterns.add_item', { item: t('topics.item_name') })}
          </Button>
        </div>
      </div>

      {/* 搜索区域 */}
      <div className="flex gap-4 items-center mb-4 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder={t('common.messages.search_placeholder', { module: t('topics.module_name') })}
            value={searchQuery}
            onChange={handleSearchChange}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
            className="pl-10"
          />
          
          {/* 搜索结果下拉框 */}
          {showSearchResults && searchResults.length > 0 && (
            <Card className="absolute top-full mt-1 w-full z-50 max-h-96 overflow-y-auto py-0 gap-0">
              <div className="py-2">
                {searchResults.map(topic => (
                  <div
                    key={topic.id}
                    onClick={() => handleSearchResultClick(topic)}
                    className="px-4 py-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground shrink-0 mt-0.5">
                        {topic.language}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm line-clamp-2 mb-1">{topic.content}</div>
                        <div className="text-xs text-muted-foreground">
                          {topic.category && getHydrationSafeCategoryDisplayName(topic.category, currentLanguage, isMounted)}
                          {topic.category && topic.subcategory && ' / '}
                          {topic.subcategory && getHydrationSafeSubcategoryDisplayName(topic.subcategory, currentLanguage, isMounted)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 结果统计 */}
      <div className="mb-2 ml-2">
        <p className="text-sm text-muted-foreground">
          {t('common.messages.total_count', { 
            count: filteredTopics.length, 
            module: t('topics.module_name') 
          })}
        </p>
      </div>

      {/* 三列布局 */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左侧 20%: Categories */}
        <Card className="w-[20%] flex flex-col py-0 gap-0">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold">{t('topics.labels.category')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto pl-2 pr-3 pt-2 pb-4">
            <div>
              {initialCategories.map((category, index) => {
                const isSelected = selectedCategoryId === category.id;
                const displayName = getHydrationSafeCategoryDisplayName(category, currentLanguage, isMounted);
                
                return (
                  <div key={category.id}>
                    <div
                      id={`category-${category.id}`}
                      onClick={() => handleCategorySelect(category.id)}
                      className={cn(
                        'flex items-center px-3 py-2 cursor-pointer transition-all text-sm border-r-4 border-transparent rounded-[0.75em]',
                        isSelected && 'bg-primary/10 dark:bg-primary/20 text-primary border-primary font-semibold',
                        !isSelected && 'hover:bg-muted'
                      )}
                    >
                      {displayName}
                    </div>
                    {index < initialCategories.length - 1 && (
                      <div className="mx-3 border-b border-border" />
                    )}
                  </div>
                );
              })}
              {initialCategories.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t('common.messages.no_items', { items: t('topics.labels.category').toLowerCase() })}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 中间 20%: Subcategories */}
        <Card className="w-[20%] flex flex-col py-0 gap-0">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold">{t('topics.labels.subcategory')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto pl-2 pr-3 pt-2 pb-4">
            <div>
              {filteredSubcategories.map((subcategory, index) => {
                const isSelected = selectedSubcategoryId === subcategory.id;
                const displayName = getHydrationSafeSubcategoryDisplayName(subcategory, currentLanguage, isMounted);
                
                return (
                  <div key={subcategory.id}>
                    <div
                      id={`subcategory-${subcategory.id}`}
                      onClick={() => handleSubcategorySelect(subcategory.id)}
                      className={cn(
                        'flex items-center px-3 py-2 cursor-pointer transition-all text-sm border-r-4 border-transparent rounded-[0.75em]',
                        isSelected && 'bg-primary/10 dark:bg-primary/20 text-primary border-primary font-semibold',
                        !isSelected && 'hover:bg-muted'
                      )}
                    >
                      {displayName}
                    </div>
                    {index < filteredSubcategories.length - 1 && (
                      <div className="mx-3 border-b border-border" />
                    )}
                  </div>
                );
              })}
              {filteredSubcategories.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {selectedCategoryId 
                    ? t('common.messages.no_items', { items: t('topics.labels.subcategory').toLowerCase() }) 
                    : t('common.messages.select_first', { entity: t('topics.labels.category').toLowerCase() })
                  }
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 右侧 60%: Topics */}
        <Card className="flex-1 flex flex-col py-0 gap-0">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold">{t('topics.labels.topic')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {filteredTopics.map(topic => (
                <div
                  key={topic.id}
                  id={`topic-${topic.id}`}
                  className="flex items-start gap-3 px-4 py-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                >
                  {/* Language Tag */}
                  <span className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground shrink-0 mt-0.5">
                    {topic.language}
                  </span>
                  
                  {/* Content */}
                  <div className="flex-1 text-sm">
                    <div className="whitespace-pre-wrap break-words">{topic.content}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t('topics.fields.used')}: {topic.usage_count}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(topic)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-red-50 group"
                          onClick={() => handleDelete(topic)}
                        >
                          <Trash2 className="h-4 w-4 group-hover:text-red-600" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {filteredTopics.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {t('common.messages.no_results', { module: t('topics.module_name') })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 管理分类对话框 */}
      <ManageCategoriesDialog
        open={manageCategoriesOpen}
        onOpenChange={setManageCategoriesOpen}
        categories={initialCategories}
        subcategories={initialSubcategories}
        currentLanguage={currentLanguage}
      />

      {/* 添加话题对话框 */}
      <AddTopicDialog
        open={addTopicOpen}
        onOpenChange={setAddTopicOpen}
        categories={initialCategories}
        subcategories={initialSubcategories}
        currentLanguage={currentLanguage}
      />

      {/* 编辑话题对话框 */}
      <EditTopicDialog
        open={editTopicOpen}
        onOpenChange={setEditTopicOpen}
        topic={selectedTopic}
        categories={initialCategories}
        subcategories={initialSubcategories}
        currentLanguage={currentLanguage}
      />

      {/* 删除话题对话框 */}
      <ConfirmDeleteDialog
        open={deleteTopicOpen}
        onOpenChange={setDeleteTopicOpen}
        title={getDeleteText()}
        onConfirm={executeDelete}
      />
    </div>
  );
}
