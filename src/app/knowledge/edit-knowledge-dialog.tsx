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

import { KnowledgeCategory, KnowledgeItem } from './page';
import { getHydrationSafeCategoryDisplayName } from './utils';
import { updateKnowledgeItem } from './actions';
import { FormFieldCard } from './components/form-field-card';
import { KnowledgeTypeSelector } from './components/knowledge-type-selector';
import { CategorySelector } from './components/category-selector';
import { LanguageSelector } from './components/language-selector';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';

interface EditKnowledgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: KnowledgeItem | null;
  categories: KnowledgeCategory[];
  currentLanguage: string;
}

interface FormData {
  language: 'en' | 'zh' | 'vi';
  // abbreviation fields
  abbreviation?: string;
  full_form?: string;
  description?: string;
  // script fields
  user_text?: string;
  answer_text?: string;
}

export function EditKnowledgeDialog({ 
  open, 
  onOpenChange, 
  item,
  categories, 
  currentLanguage 
}: EditKnowledgeDialogProps) {
  const { t, isMounted } = useHydrationSafeTranslation();
  
  // 状态管理
  const [formData, setFormData] = useState<FormData>({
    language: 'en',
    abbreviation: '',
    full_form: '',
    description: '',
    user_text: '',
    answer_text: '',
  });
  
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 当item变化时更新表单数据
  useEffect(() => {
    if (item) {
      setFormData({
        language: item.language,
        abbreviation: item.abbreviation || '',
        full_form: item.full_form || '',
        description: item.description || '',
        user_text: item.user_text || '',
        answer_text: item.answer_text || '',
      });
    }
  }, [item]);

  // 获取当前分类的显示名称
  const getCategoryName = () => {
    if (!item?.category) return '';
    return getHydrationSafeCategoryDisplayName(item.category, currentLanguage, isMounted);
  };

  // 表单验证
  const validateForm = (): string | null => {
    if (!item) return t('common.validation.select_required', { 
      field: t('knowledge.entities.category')
    });
    
    if (item.knowledge_type === 'abbreviation') {
      if (!formData.abbreviation?.trim()) return t('common.validation.field_required', { field: t('knowledge.fields.abbreviation') });
      if (!formData.full_form?.trim()) return t('common.validation.field_required', { field: t('knowledge.fields.full_form') });
    } else if (item.knowledge_type === 'script') {
      if (!formData.user_text?.trim()) return t('common.validation.field_required', { field: t('knowledge.fields.user_text') });
      if (!formData.answer_text?.trim()) return t('common.validation.field_required', { field: t('knowledge.fields.answer_text') });
    }
    
    return null;
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!item) return;

    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateKnowledgeItem({
        id: item.id,
        knowledge_type: item.knowledge_type,
        category_id: item.category_id || undefined,
        language: formData.language,
        ...(item.knowledge_type === 'abbreviation' ? {
          abbreviation: formData.abbreviation?.trim(),
          full_form: formData.full_form?.trim(),
          description: formData.description?.trim() || undefined,
        } : {
          user_text: formData.user_text?.trim(),
          answer_text: formData.answer_text?.trim(),
        })
      });

      if (result.success) {
        onOpenChange(false);
      } else {
        alert(result.error || t('common.validation.update_failed'));
      }
    } catch (error) {
      alert(t('common.validation.update_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('knowledge.dialogs.edit')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Knowledge Type (Disabled) */}
          <KnowledgeTypeSelector
            value={item.knowledge_type}
            onChange={() => {}} // 禁用状态，不需要处理变化
            disabled={true}
          />

          {/* Category (Disabled) */}
          <CategorySelector
            knowledgeType={item.knowledge_type}
            categories={categories}
            value={item.category_id || ''}
            onChange={() => {}} // 禁用状态，不需要处理变化
            currentLanguage={currentLanguage}
            disabled={true}
          />

          {/* Language */}
          <LanguageSelector
            value={formData.language}
            onChange={(language) => setFormData(prev => ({ ...prev, language }))}
          />

          {/* Dynamic Fields based on Knowledge Type */}
          {item.knowledge_type === 'abbreviation' ? (
            // Abbreviation Fields - 每个字段一个卡片
            <div className="space-y-4">
              <FormFieldCard>
                <div className="space-y-2">
                  <Label>{t('knowledge.fields.abbreviation')}:</Label>
                  <Input
                    value={formData.abbreviation || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, abbreviation: e.target.value }))}
                    placeholder={t('common.placeholders.enter_field', { field: t('knowledge.fields.abbreviation') })}
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
                    placeholder={t('common.placeholders.enter_field', { field: t('knowledge.fields.full_form') })}
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
                    placeholder={t('common.placeholders.enter_field', { field: t('knowledge.fields.user_text') })}
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
                    placeholder={t('common.placeholders.enter_field', { field: t('knowledge.fields.answer_text') })}
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
                {isSubmitting ? t('common.status.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
