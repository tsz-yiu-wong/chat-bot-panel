'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Edit, Trash2, Filter, ChevronDown, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';

import { KnowledgeCategory, KnowledgeItem } from './page';
import { getCategoryDisplayName, getHydrationSafeCategoryDisplayName, filterKnowledgeItems } from './utils';
import { deleteKnowledgeItem } from './actions';
import { ManageCategoriesDialog } from './manage-categories-dialog';
import { AddKnowledgeDialog } from './add-knowledge-dialog';
import { EditKnowledgeDialog } from './edit-knowledge-dialog';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';

interface KnowledgeListProps {
  initialCategories: KnowledgeCategory[];
  initialItems: KnowledgeItem[];
}

export function KnowledgeList({ initialCategories, initialItems }: KnowledgeListProps) {
  // 使用hydration-safe翻译，避免hydration不匹配
  const { t, isMounted, currentLanguage } = useHydrationSafeTranslation();

  // 状态管理
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState<boolean>(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState<boolean>(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState<boolean>(false);
  const [addKnowledgeOpen, setAddKnowledgeOpen] = useState<boolean>(false);
  const [editKnowledgeOpen, setEditKnowledgeOpen] = useState<boolean>(false);
  const [deleteKnowledgeOpen, setDeleteKnowledgeOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);

  // 根据选中的类型获取可用的分类
  const availableCategories = useMemo(() => {
    if (selectedType === 'all') return [];
    return initialCategories
      .filter(cat => cat.knowledge_type === selectedType)
      .map(cat => ({
        ...cat,
        displayName: getHydrationSafeCategoryDisplayName(cat, currentLanguage, isMounted)
      }))
      .filter(cat => cat.displayName); // 过滤掉没有显示名称的分类
  }, [initialCategories, selectedType, currentLanguage, isMounted]);

  // 筛选后的知识库项目
  const filteredItems = useMemo(() => {
    return filterKnowledgeItems(initialItems, selectedType, selectedCategory, searchQuery);
  }, [initialItems, selectedType, selectedCategory, searchQuery]);

  // 当类型改变时重置分类选择
  const handleTypeChange = (newType: string) => {
    setSelectedType(newType);
    setSelectedCategory('all');
  };

  // 获取当前选中分类的显示名称
  const getSelectedCategoryName = () => {
    if (selectedCategory === 'all') return t('common.all');
    const category = availableCategories.find(cat => cat.id === selectedCategory);
    return category?.displayName || t('common.all');
  };

  // 处理编辑
  const handleEdit = (item: KnowledgeItem) => {
    setSelectedItem(item);
    setEditKnowledgeOpen(true);
  };

  // 处理删除
  const handleDelete = (item: KnowledgeItem) => {
    setSelectedItem(item);
    setDeleteKnowledgeOpen(true);
  };

  // 获取删除确认文本
  const getDeleteText = () => {
    if (!selectedItem) return '';
    
    const type = selectedItem.knowledge_type === 'abbreviation' 
      ? t('knowledge.types.abbreviation') 
      : t('knowledge.types.script');
    let value = '';
    
    if (selectedItem.knowledge_type === 'abbreviation') {
      value = selectedItem.abbreviation || '';
    } else {
      value = selectedItem.user_text || '';
    }
    
    return t('knowledge.actions.delete_confirm', { type, name: value });
  };

  // 执行删除
  const executeDelete = async () => {
    if (!selectedItem) return;

    const result = await deleteKnowledgeItem(selectedItem.id);

    if (result.success) {
      setDeleteKnowledgeOpen(false);
      setSelectedItem(null);
    } else {
      alert(result.error || 'Failed to delete knowledge item');
    }
  };

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* 页面标题和添加按钮 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('knowledge.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManageCategoriesOpen(true)}>
            <Settings className="h-4 w-4" />
            {t('knowledge.buttons.manage_categories', 'Manage Categories')}
          </Button>
          <Button className="text-white" onClick={() => setAddKnowledgeOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('knowledge.add_knowledge')}
          </Button>
        </div>
      </div>

      {/* 搜索和筛选区域 */}
      <div className="flex gap-4 items-center mb-6">
        {/* 搜索框 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('knowledge.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Filter className="h-4 w-4 text-muted-foreground" />
        
        {/* 知识库类型筛选 */}
        <DropdownMenu onOpenChange={setTypeDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[180px] justify-between">
              {selectedType === 'all' 
                ? t('common.all') 
                : t(`knowledge.types.${selectedType}`)
              }
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${typeDropdownOpen ? 'rotate-180' : ''}`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleTypeChange('all')}>
              {t('common.all')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTypeChange('abbreviation')}>
              {t('knowledge.types.abbreviation')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTypeChange('script')}>
              {t('knowledge.types.script')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 分类筛选 */}
        <DropdownMenu onOpenChange={setCategoryDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="min-w-[180px] justify-between"
              disabled={selectedType === 'all'}
            >
              {getSelectedCategoryName()}
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSelectedCategory('all')}>
              {t('common.all')}
            </DropdownMenuItem>
            {availableCategories.map(category => (
              <DropdownMenuItem 
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.displayName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 结果统计 */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {t('knowledge.total_count', { count: filteredItems.length })}
        </p>
      </div>

      {/* 知识库列表 */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-2">
        <div className="grid gap-4 pb-12">
          {filteredItems.map((item) => (
            <Card key={item.id} className="p-4">
              {item.knowledge_type === 'abbreviation' ? (
                // Abbreviation 卡片布局：两行
                <div className="space-y-2">
                  {/* 第一行：分类标签 + 语言标签 + 操作按钮 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded-md bg-primary/10 dark:bg-primary/20 text-primary">
                        {item.category ? getHydrationSafeCategoryDisplayName(item.category, currentLanguage, isMounted) : t('knowledge.labels.category', 'Category')}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground">
                        {item.language}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-red-50 group"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="h-4 w-4 group-hover:text-red-600" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* 第二行：缩写 -> 全写 | 描述 */}
                  <div className="text-sm">
                    <span className="font-medium">{item.abbreviation}</span>
                    <span className="mx-2">→</span>
                    <span className="font-medium">{item.full_form}</span>
                    {item.description && (
                      <>
                        <span className="mx-2 text-muted-foreground">|</span>
                        <span className="text-muted-foreground">{item.description}</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                // Script 卡片布局：三行
                <div className="space-y-2">
                  {/* 第一行：分类标签 + 语言标签 + 操作按钮 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-semibold rounded-md bg-primary/10 dark:bg-primary/20 text-primary">
                        {item.category ? getHydrationSafeCategoryDisplayName(item.category, currentLanguage, isMounted) : t('knowledge.labels.scene', 'Scene')}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground">
                        {item.language}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-red-50 group"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="h-4 w-4 group-hover:text-red-600" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* 第二行：User: {user text} */}
                  {item.user_text && (
                    <div className="text-sm">
                      <span className="font-medium">{t('knowledge.fields.user_text', 'User')}:</span>
                      <span className="ml-1">{item.user_text}</span>
                    </div>
                  )}
                  
                  {/* 第三行：Script: {answer text} */}
                  {item.answer_text && (
                    <div className="text-sm">
                      <span className="font-medium">{t('knowledge.fields.answer_text', 'Script')}:</span>
                      <span className="ml-1">{item.answer_text}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
          
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{t('knowledge.no_results')}</p>
            </div>
          )}
        </div>
      </div>

      {/* 管理分类对话框 */}
      <ManageCategoriesDialog
        open={manageCategoriesOpen}
        onOpenChange={setManageCategoriesOpen}
        categories={initialCategories}
        currentLanguage={currentLanguage}
      />

      {/* 添加知识库对话框 */}
      <AddKnowledgeDialog
        open={addKnowledgeOpen}
        onOpenChange={setAddKnowledgeOpen}
        categories={initialCategories}
        currentLanguage={currentLanguage}
      />

      {/* 编辑知识库对话框 */}
      <EditKnowledgeDialog
        open={editKnowledgeOpen}
        onOpenChange={setEditKnowledgeOpen}
        item={selectedItem}
        categories={initialCategories}
        currentLanguage={currentLanguage}
      />

      {/* 删除知识库对话框 */}
      <ConfirmDeleteDialog
        open={deleteKnowledgeOpen}
        onOpenChange={setDeleteKnowledgeOpen}
        title={getDeleteText()}
        onConfirm={executeDelete}
      />
    </div>
  );
}
