'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { KnowledgeCategory } from './page';
import { createKnowledgeItem } from './actions';
import { BaseFormDialog } from '@/components/shared/base-form-dialog';
import { FormFieldCard } from '@/components/shared/form-field-card';
import { KnowledgeTypeSelector } from './selector-knowledge-type';
import { CategorySelector } from './selector-category';
import { LanguageSelector } from '@/components/shared/language-selector';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { useToast } from '@/components/ui/toast';

interface AddKnowledgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: KnowledgeCategory[];
  currentLanguage: string; // UI 语言
}

interface FormData {
  knowledge_type: 'abbreviation' | 'script';
  category_id: string;
  language: string;
  abbreviation?: string;
  full_form?: string;
  description?: string;
  user_text?: string;
  answer_text?: string;
}

export function AddKnowledgeDialog({ 
  open, 
  onOpenChange, 
  categories, 
  currentLanguage
}: AddKnowledgeDialogProps) {
  const { t } = useHydrationSafeTranslation();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    knowledge_type: 'abbreviation',
    category_id: '',
    language: 'en',
    abbreviation: '',
    full_form: '',
    description: '',
    user_text: '',
    answer_text: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  // 当类型改变时重置分类选择
  const handleTypeChange = (newType: 'abbreviation' | 'script') => {
    setFormData(prev => ({
      ...prev,
      knowledge_type: newType,
      category_id: '',
    }));
  };

  // 表单验证
  const validateForm = (): string | null => {
    if (!formData.category_id) return t('common.validation.select_required', { 
      field: formData.knowledge_type === 'abbreviation' ? t('knowledge.labels.category') : t('knowledge.labels.scene') 
    });
    
    if (formData.knowledge_type === 'abbreviation') {
      if (!formData.abbreviation?.trim()) return t('common.validation.field_required', { field: t('knowledge.fields.abbreviation') });
      if (!formData.full_form?.trim()) return t('common.validation.field_required', { field: t('knowledge.fields.full_form') });
    } else if (formData.knowledge_type === 'script') {
      if (!formData.user_text?.trim()) return t('common.validation.field_required', { field: t('knowledge.fields.user_text') });
      if (!formData.answer_text?.trim()) return t('common.validation.field_required', { field: t('knowledge.fields.answer_text') });
    }
    
    return null;
  };

  // 提交表单
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      addToast('warning', validationError);
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
        addToast('success', t('common.messages.create_success'));
        resetForm();
        onOpenChange(false);
      } else {
        addToast('error', result.error || t('common.validation.create_failed'));
      }
    } catch (error) {
      addToast('error', t('common.validation.create_failed'));
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
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('common.patterns.add_item', { item: t('knowledge.item_name') })}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      selectors={
        <>
          <KnowledgeTypeSelector
            value={formData.knowledge_type}
            onChange={handleTypeChange}
          />
          <CategorySelector
            knowledgeType={formData.knowledge_type}
            categories={categories}
            value={formData.category_id}
            onChange={(categoryId) => setFormData(prev => ({ ...prev, category_id: categoryId }))}
            currentLanguage={currentLanguage}
          />
          <LanguageSelector
            value={formData.language}
            onChange={(language) => setFormData(prev => ({ ...prev, language }))}
          />
        </>
      }
      formFields={
        <>
          {formData.knowledge_type === 'abbreviation' ? (
            <>
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
                    placeholder={t('common.placeholders.enter_optional', { field: t('knowledge.fields.description') })}
                    className="bg-muted"
                  />
                </div>
              </FormFieldCard>
            </>
          ) : (
            <>
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
            </>
          )}
        </>
      }
    />
  );
}