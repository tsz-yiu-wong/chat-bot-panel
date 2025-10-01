'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Plus, Save, Trash2, Camera, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Character } from './page';
import { filterCharacters } from './utils';
import { updateCharacter, deleteCharacter } from './actions';
import { AddCharacterDialog } from './dialog-add-character';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { useUser } from '@/components/user-context';
import { hasOperationPermission } from '@/lib/permissions';
import { LanguageSelector } from '@/components/shared/language-selector';
import { language_type } from './page';

interface CharactersListProps {
  initialCharacters: Character[];
}

type TabKey = 'basic_info' | 'daily_life' | 'experience' | 'values' | 'dreams' | 'self_evaluation' | 'photo';

export function CharactersList({ initialCharacters }: CharactersListProps) {
  const { t } = useHydrationSafeTranslation();
  const { userRole } = useUser();
  const { addToast } = useToast();
  const canEdit = userRole ? hasOperationPermission(userRole, 'edit') : false;
  const canDelete = userRole ? hasOperationPermission(userRole, 'delete') : false;

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [editedCharacter, setEditedCharacter] = useState<Partial<Character> | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('basic_info');
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // 全局搜索结果（用于下拉框显示）
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filterCharacters(initialCharacters, searchQuery).slice(0, 10); // 最多显示10个结果
  }, [initialCharacters, searchQuery]);

  // 左侧列表显示的人设（不受搜索影响）
  const filteredCharacters = useMemo(() => {
    return initialCharacters;
  }, [initialCharacters]);

  useEffect(() => {
    if (filteredCharacters.length > 0 && !selectedCharacter) {
      const firstChar = filteredCharacters[0];
      setSelectedCharacter(firstChar);
      setEditedCharacter(firstChar);
    } else if (filteredCharacters.length === 0) {
      setSelectedCharacter(null);
      setEditedCharacter(null);
    }
  }, [filteredCharacters, selectedCharacter]);

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setEditedCharacter(character);
    setActiveTab('basic_info');
    setIsEditingName(false);
    setTempName('');
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(value.trim().length > 0);
  };

  // 处理搜索结果点击
  const handleSearchResultClick = (character: Character) => {
    // 选中该人设
    handleSelectCharacter(character);
    
    // 清空搜索
    setSearchQuery('');
    setShowSearchResults(false);

    // 滚动到对应的人设
    setTimeout(() => {
      const characterElement = document.getElementById(`character-${character.id}`);
      if (characterElement) {
        characterElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleStartEditName = () => {
    if (!canEdit) return;
    setIsEditingName(true);
    setTempName(editedCharacter?.name || '');
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setTempName('');
  };

  const handleConfirmEditName = () => {
    if (tempName.trim() && editedCharacter) {
      setEditedCharacter({ ...editedCharacter, name: tempName.trim() });
      setIsEditingName(false);
    }
  };

  const handleInputChange = (field: keyof Character, value: any) => {
    if (editedCharacter) {
      setEditedCharacter({ ...editedCharacter, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!editedCharacter || !selectedCharacter) return;

    setIsSaving(true);
    const result = await updateCharacter(editedCharacter as Character);

    if (result.success) {
      addToast('success', t('common.messages.save_success'));
      setSelectedCharacter(result.data as Character);
    } else {
      addToast('error', result.error || t('common.messages.save_failed'));
    }
    setIsSaving(false);
  };
  
  const handleDelete = () => {
    if (!selectedCharacter) return;
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!selectedCharacter) return;

    const result = await deleteCharacter(selectedCharacter.id);

    if (result.success) {
      addToast('success', t('common.messages.delete_success'));
      setDeleteDialogOpen(false);
      setSelectedCharacter(null);
    } else {
      addToast('error', result.error || t('common.messages.delete_failed'));
    }
  };

  const getDeleteText = () => {
    if (!selectedCharacter) return '';
    return t('common.actions.delete_confirm', { 
      type: t('characters.item_name'), 
      name: selectedCharacter.name || '' 
    });
  };

  // 单行输入框字段（现居地、工作地、家庭成员）
  const singleLineFields = ['current_address', 'work_address', 'family_member'];

  // 渲染单行输入框（基本信息 - 双列布局）
  const renderBasicInfoField = useCallback((field: keyof Character, label: string) => (
    <div key={field} className="grid grid-cols-4 items-center gap-3">
      <label className="text-sm font-medium text-right">{label}:</label>
      <Input
        value={editedCharacter?.[field] as string | number || ''}
        onChange={(e) => handleInputChange(field, e.target.value)}
        className="col-span-3 bg-muted/50"
        disabled={!canEdit}
      />
    </div>
  ), [editedCharacter, canEdit]);

  // 渲染单行输入框（单列布局）
  const renderSingleLineField = useCallback((field: keyof Character, label: string) => (
    <div key={field} className="grid grid-cols-8 items-center gap-4">
      <label className="text-sm font-medium text-right">{label}:</label>
      <Input
        value={editedCharacter?.[field] as string | number || ''}
        onChange={(e) => handleInputChange(field, e.target.value)}
        className="col-span-7 bg-muted/50"
        disabled={!canEdit}
      />
    </div>
  ), [editedCharacter, canEdit]);

  // 渲染多行文本框（单列布局）
  const renderTextareaField = useCallback((field: keyof Character, label: string) => (
    <div key={field} className="grid grid-cols-8 items-start gap-4">
      <label className="text-sm font-medium text-right pt-2">{label}:</label>
      <Textarea
        value={editedCharacter?.[field] as string || ''}
        onChange={(e) => handleInputChange(field, e.target.value)}
        className="col-span-7 min-h-[70px] resize-y bg-muted/50"
        disabled={!canEdit}
      />
    </div>
  ), [editedCharacter, canEdit]);

  // 根据字段类型和所在标签页选择渲染方法
  const renderField = useCallback((field: keyof Character, label: string, isBasicInfo: boolean = false) => {
    // 基本信息标签页 - 全部使用单行输入框（双列布局）
    if (isBasicInfo) {
      return renderBasicInfoField(field, label);
    }
    // 其他标签页 - 根据字段类型选择（单列布局）
    if (singleLineFields.includes(field as string)) {
      return renderSingleLineField(field, label);
    }
    return renderTextareaField(field, label);
  }, [renderBasicInfoField, renderSingleLineField, renderTextareaField]);

  const tabs: { key: TabKey; label: string; fields: (keyof Character)[]; columns?: number }[] = [
    { 
      key: 'basic_info', 
      label: t('characters.tabs.basic_info'), 
      fields: ['gender', 'age', 'height_cm', 'weight_kg', 'marital_status', 'job_title', 'birth_date', 'birth_place', 'zodiac', 'blood_type', 'nationality', 'ancestral_home'],
      columns: 2 // 两列布局
    },
    { 
      key: 'daily_life', 
      label: t('characters.tabs.daily_life'), 
      fields: ['current_address', 'work_address', 'family_member', 'daily_routine', 'favourite'],
      columns: 1 // 一列布局
    },
    { 
      key: 'experience', 
      label: t('characters.tabs.experience'), 
      fields: ['relationship_exp', 'education_exp', 'work_exp', 'life_event'],
      columns: 1 // 一列布局
    },
    { 
      key: 'values', 
      label: t('characters.tabs.values'), 
      fields: ['worldview', 'life_philosophy', 'personal_values'],
      columns: 1 // 一列布局
    },
    { 
      key: 'dreams', 
      label: t('characters.tabs.dreams'), 
      fields: ['future_plan', 'wish_place', 'life_dream'],
      columns: 1 // 一列布局
    },
    { 
      key: 'self_evaluation', 
      label: t('characters.tabs.self_evaluation'), 
      fields: ['self_evaluation'],
      columns: 1 // 一列布局
    },
  ];
  
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3rem)' }}>
      {/* 页面标题和添加按钮 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('common.titles.management', { module: t('characters.module_name') })}</h1>
        {canEdit && (
            <Button className="text-white" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('common.patterns.add_item', { item: t('characters.item_name') })}
            </Button>
        )}
      </div>

      {/* 搜索区域 */}
      <div className="flex gap-4 items-center mb-4 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder={t('common.messages.search_placeholder', { module: t('characters.module_name') })}
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
                {searchResults.map(character => (
                  <div
                    key={character.id}
                    onClick={() => handleSearchResultClick(character)}
                    className="px-4 py-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground shrink-0 mt-0.5">
                        {character.language}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium mb-1">{character.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[character.age && `${character.age}${t('characters.fields.age')}`, character.gender, character.job_title].filter(Boolean).join(' · ')}
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
            count: filteredCharacters.length, 
            module: t('characters.module_name') 
          })}
        </p>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Column: Character List */}
        <Card className="w-[15%] flex flex-col py-0 gap-0">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold">{t('characters.item_name')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto pl-2 pr-3 pt-2 pb-4">
            <div>
              {filteredCharacters.map((character, index) => {
                const isSelected = selectedCharacter?.id === character.id;
                
                return (
                  <div key={character.id}>
                    <div
                      id={`character-${character.id}`}
                      onClick={() => handleSelectCharacter(character)}
                      className={cn(
                        'flex items-center px-3 py-2 cursor-pointer transition-all text-sm border-r-4 border-transparent rounded-[0.75em]',
                        isSelected && 'bg-primary/10 dark:bg-primary/20 text-primary border-primary font-semibold',
                        !isSelected && 'hover:bg-muted'
                      )}
                    >
                      {character.name}
                    </div>
                    {index < filteredCharacters.length - 1 && (
                      <div className="mx-3 border-b border-border" />
                    )}
                  </div>
                );
              })}
              {filteredCharacters.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t('common.messages.no_items', { items: t('characters.module_name') })}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Right Column: Character Details */}
        <Card className="w-[85%] flex flex-col py-0 gap-0">
          {selectedCharacter && editedCharacter ? (
            <>
              {/* Header */}
              <div className="flex items-center px-6 pt-6 pb-3">
                {isEditingName ? (
                  <>
                    <Input
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmEditName();
                        if (e.key === 'Escape') handleCancelEditName();
                      }}
                      className="!text-xl font-bold h-auto py-1 w-auto min-w-[50px]"
                      style={{ width: `${Math.max(tempName.length * 12 + 40, 50)}px` }}
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" onClick={handleCancelEditName} className="ml-1">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold">{editedCharacter.name}</h2>
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={handleStartEditName} className="h-7 w-7 ml-1">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </>
                )}
                <span className="text-sm text-muted-foreground ml-4">{t('characters.language_label')}:</span>
                <div className="[&_button]:h-8 [&_button]:py-0 ml-2">
                  <LanguageSelector
                    value={editedCharacter.language || 'en'}
                    onChange={(value: language_type) => handleInputChange('language', value)}
                    disabled={!canEdit}
                    showLabel={false}
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b px-4">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'px-4 py-1 text-sm focus:outline-none',
                      activeTab === tab.key 
                        ? 'border-b-2 border-primary text-primary font-semibold bg-primary/10 rounded-t-md' 
                        : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
                 <button
                    key="photo"
                    onClick={() => setActiveTab('photo')}
                    className={cn(
                      'px-4 py-2 text-sm focus:outline-none flex items-center gap-2',
                      activeTab === 'photo'
                        ? 'border-b-2 border-primary text-primary font-semibold bg-primary/10 rounded-t-md'
                        : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <Camera className="h-4 w-4" />
                    {t('characters.tabs.photo')}
                  </button>
              </div>

              {/* Content Card */}
              <div className="flex-1 overflow-y-auto py-6 pl-4 pr-12 min-h-0">
                {activeTab !== 'photo' && (
                  <div className={cn(
                    "gap-x-10 gap-y-6",
                    tabs.find(t => t.key === activeTab)?.columns === 2 ? "grid grid-cols-2" : "flex flex-col"
                  )}>
                    {tabs.find(t => t.key === activeTab)?.fields.map(field => 
                      renderField(field, t(`characters.fields.${field}`), activeTab === 'basic_info')
                    )}
                  </div>
                )}
                {activeTab === 'photo' && (
                    <div className="text-center py-12 text-muted-foreground">Coming Soon</div>
                )}
              </div>

              {/* Footer Buttons */}
              {(canEdit || canDelete) && (
                <div className="flex items-center justify-end px-6 py-3 border-t">
                  <div className="flex items-center gap-4">
                    {canDelete && (
                      <Button 
                        variant="outline" 
                        onClick={handleDelete}
                        className="hover:text-red-600 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-950/40 dark:hover:border-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('common.delete')}
                      </Button>
                    )}
                    {canEdit && (
                      <Button onClick={handleSave} disabled={isSaving} className="text-white">
                        <Save className="h-4 w-4" />
                        {isSaving ? t('common.status.saving') : t('common.actions.save_edits')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">{t('common.messages.no_items', { items: t('characters.module_name') })}</p>
            </div>
          )}
        </Card>
      </div>
      
      <AddCharacterDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={getDeleteText()}
        onConfirm={executeDelete}
      />
    </div>
  );
}
