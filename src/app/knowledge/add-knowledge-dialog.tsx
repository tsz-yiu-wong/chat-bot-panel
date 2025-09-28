'use client';

import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { KnowledgeCategory } from './page';
import { getHydrationSafeCategoryDisplayName } from './utils';
import { createKnowledgeItem } from './actions';
import { FormFieldCard } from './components/form-field-card';
import { KnowledgeTypeSelector } from './components/knowledge-type-selector';
import { CategorySelector } from './components/category-selector';
import { LanguageSelector } from './components/language-selector';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';

interface AddKnowledgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: KnowledgeCategory[];
  currentLanguage: string;
}

interface FormData {
  knowledge_type: 'abbreviation' | 'script';
  category_id: string;
  language: 'en' | 'zh' | 'vi';
  // abbreviation fields
  abbreviation?: string;
  full_form?: string;
  description?: string;
  // script fields
  user_text?: string;
  answer_text?: string;
}

export function AddKnowledgeDialog({ 
  open, 
  onOpenChange, 
  categories, 
  currentLanguage 
}: AddKnowledgeDialogProps) {
  const { t, isMounted } = useHydrationSafeTranslation();
  
  // 状态管理
  const [formData, setFormData] = useState<FormData>({
    knowledge_type: 'abbreviation', // 默认abbreviation
    category_id: '',
    language: 'en',
    abbreviation: '',
    full_form: '',
    description: '',
    user_text: '',
    answer_text: '',
  });
  
  const [typeDropdownOpen, setTypeDropdownOpen] = useState<boolean>(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState<boolean>(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 根据选中类型获取可用分类
  const availableCategories = categories.filter(cat => 
    cat.knowledge_type === formData.knowledge_type
  ).map(cat => ({
    ...cat,
    displayName: getHydrationSafeCategoryDisplayName(cat, currentLanguage, isMounted)
  }));

  // 当类型改变时重置分类选择
  const handleTypeChange = (newType: 'abbreviation' | 'script') => {
    setFormData(prev => ({
      ...prev,
      knowledge_type: newType,
      category_id: '', // 重置分类选择
    }));
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      knowledge_type: 'abbreviation',
      category_id: '',
      language: 'en',
      abbreviation: '',
      full_form: '',
      description: '',
      user_text: '',
      answer_text: '',
    });
  };

  // 获取选中分类的显示名称
  const getSelectedCategoryName = () => {
    if (!formData.category_id) return 'Select category';
    const category = availableCategories.find(cat => cat.id === formData.category_id);
    return category?.displayName || 'Select category';
  };

  // 表单验证
  const validateForm = (): string | null => {
    if (!formData.category_id) return t('knowledge.validation.select_category');
    
    if (formData.knowledge_type === 'abbreviation') {
      if (!formData.abbreviation?.trim()) return t('knowledge.validation.abbreviation_required');
      if (!formData.full_form?.trim()) return t('knowledge.validation.full_form_required');
    } else if (formData.knowledge_type === 'script') {
      if (!formData.user_text?.trim()) return t('knowledge.validation.user_text_required');
      if (!formData.answer_text?.trim()) return t('knowledge.validation.answer_text_required');
    }
    
    return null;
  };

  // 提交表单
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createKnowledgeItem({
        knowledge_type: formData.knowledge_type,
        category_id: formData.category_id,
        language: formData.language,
        ...(formData.knowledge_type === 'abbreviation' ? {
          abbreviation: formData.abbreviation?.trim(),
          full_form: formData.full_form?.trim(),
          description: formData.description?.trim() || undefined,
        } : {
          user_text: formData.user_text?.trim(),
          answer_text: formData.answer_text?.trim(),
        })
      });

      if (result.success) {
        resetForm();
        onOpenChange(false);
      } else {
        alert(result.error || t('knowledge.validation.create_failed'));
      }
    } catch (error) {
      alert(t('knowledge.validation.create_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 关闭对话框时重置表单
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('knowledge.dialogs.add_knowledge')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Knowledge Type */}
          <KnowledgeTypeSelector
            value={formData.knowledge_type}
            onChange={handleTypeChange}
          />

          {/* Category */}
          <CategorySelector
            knowledgeType={formData.knowledge_type}
            categories={categories}
            value={formData.category_id}
            onChange={(categoryId) => setFormData(prev => ({ ...prev, category_id: categoryId }))}
            currentLanguage={currentLanguage}
          />

          {/* Language */}
          <LanguageSelector
            value={formData.language}
            onChange={(language) => setFormData(prev => ({ ...prev, language }))}
          />

          {/* Dynamic Fields based on Knowledge Type */}
          {formData.knowledge_type === 'abbreviation' ? (
            // Abbreviation Fields - 每个字段一个卡片
            <div className="space-y-4">
              <FormFieldCard>
                <div className="space-y-2">
                  <Label>{t('knowledge.fields.abbreviation')}:</Label>
                  <Input
                    value={formData.abbreviation || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, abbreviation: e.target.value }))}
                    placeholder={t('knowledge.placeholders.enter_abbreviation')}
                    className="bg-muted"
                  />
                </div>
              </FormFieldCard>
              
              <FormFieldCard>
                <div className="space-y-2">
                  <Label>{t('knowledge.fields.full_form')}:</Label>
                  <Input
                    value={formData.full_form || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_form: e.target.value }))}
                    placeholder={t('knowledge.placeholders.enter_full_form')}
                    className="bg-muted"
                  />
                </div>
              </FormFieldCard>
              
              <FormFieldCard>
                <div className="space-y-2">
                  <Label>{t('knowledge.fields.description')}:</Label>
                  <Input
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t('knowledge.placeholders.enter_description')}
                    className="bg-muted"
                  />
                </div>
              </FormFieldCard>
            </div>
          ) : (
            // Script Fields - 每个字段一个卡片
            <div className="space-y-4">
              <FormFieldCard>
                <div className="space-y-2">
                  <Label>{t('knowledge.fields.user_text')}:</Label>
                  <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.user_text || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, user_text: e.target.value }))}
                    placeholder={t('knowledge.placeholders.enter_user_text')}
                  />
                </div>
              </FormFieldCard>
              
              <FormFieldCard>
                <div className="space-y-2">
                  <Label>{t('knowledge.fields.answer_text')}:</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.answer_text || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, answer_text: e.target.value }))}
                    placeholder={t('knowledge.placeholders.enter_answer_text')}
                  />
                </div>
              </FormFieldCard>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex pt-4 border-t">
            <div className="flex-1 flex justify-center">
              <Button 
                variant="outline" 
                className="w-40"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
            </div>
            <div className="flex-1 flex justify-center">
              <Button 
                className="w-40 text-white"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? t('knowledge.actions.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
