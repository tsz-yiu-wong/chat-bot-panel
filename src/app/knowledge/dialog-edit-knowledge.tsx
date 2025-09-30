'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { KnowledgeCategory, KnowledgeItem } from './page';
import { updateKnowledgeItem } from './actions';
import { BaseFormDialog } from '@/components/shared/base-form-dialog';
import { FormFieldCard } from '@/components/shared/form-field-card';
import { KnowledgeTypeSelector } from './selector-knowledge-type';
import { CategorySelector } from './selector-category';
import { LanguageSelector } from '@/components/shared/language-selector';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { useToast } from '@/components/ui/toast';

interface EditKnowledgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: KnowledgeItem | null;
  categories: KnowledgeCategory[];
  currentLanguage: string;
}

interface FormData {
  language: 'en' | 'zh' | 'vi';
  abbreviation?: string;
  full_form?: string;
  description?: string;
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
  const { t } = useHydrationSafeTranslation();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    language: 'en',
    abbreviation: '',
    full_form: '',
    description: '',
    user_text: '',
    answer_text: '',
  });
  
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

  // 表单验证
  const validateForm = (): string | null => {
    if (!item) return t('common.validation.select_required', { 
      field: t('knowledge.labels.category')
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
      addToast('warning', validationError);
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
        addToast('success', t('common.messages.update_success'));
        onOpenChange(false);
      } else {
        addToast('error', result.error || t('common.validation.update_failed'));
      }
    } catch (error) {
      addToast('error', t('common.validation.update_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('common.patterns.edit_item', { item: t('knowledge.item_name') })}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      selectors={
        <>
          <KnowledgeTypeSelector
            value={item.knowledge_type}
            onChange={() => {}}
            disabled={true}
          />
          <CategorySelector
            knowledgeType={item.knowledge_type}
            categories={categories}
            value={item.category_id || ''}
            onChange={() => {}}
            currentLanguage={currentLanguage}
            disabled={true}
          />
          <LanguageSelector
            value={formData.language}
            onChange={(language) => setFormData(prev => ({ ...prev, language }))}
          />
        </>
      }
      formFields={
        <>
          {item.knowledge_type === 'abbreviation' ? (
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