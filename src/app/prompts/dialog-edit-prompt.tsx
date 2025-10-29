'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { PromptStage, Prompt } from './page';
import { updatePrompt } from './actions';
import { BaseFormDialog } from '@/components/shared/base-form-dialog';
import { FormFieldCard } from '@/components/shared/form-field-card';
import { StageSelector } from './selector-stag';
import { LanguageSelector } from '@/components/shared/language-selector';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { useToast } from '@/components/ui/toast';

interface EditPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: Prompt | null;
  stages: PromptStage[];
}

interface FormData {
  name: string;
  language: string;
  prompt: string;
  note: string;
}

export function EditPromptDialog({ 
  open, 
  onOpenChange, 
  prompt,
  stages
}: EditPromptDialogProps) {
  const { t } = useHydrationSafeTranslation();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    language: 'en',
    prompt: '',
    note: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 当 prompt 变化时更新表单数据
  useEffect(() => {
    if (prompt) {
      setFormData({
        name: prompt.name || '',
        language: prompt.language,
        prompt: prompt.prompt || '',
        note: prompt.mark || '',
      });
    }
  }, [prompt]);

  // 表单验证
  const validateForm = (): string | null => {
    if (!prompt) return t('common.validation.select_required', { field: t('prompts.labels.stage') });
    if (!formData.name?.trim()) return t('common.validation.field_required', { field: t('prompts.fields.name') });
    return null;
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!prompt) return;

    const validationError = validateForm();
    if (validationError) {
      addToast('warning', validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updatePrompt({
        id: prompt.id,
        name: formData.name.trim(),
        stage_id: prompt.stage_id || undefined,
        language: formData.language,
        prompt: formData.prompt.trim() || undefined,
        mark: formData.note.trim() || undefined,
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

  if (!prompt) return null;

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('common.patterns.edit_item', { item: t('prompts.item_name') })}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      selectors={
        <>
          <StageSelector
            stages={stages}
            value={prompt.stage_id || ''}
            onChange={() => {}}
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
          <FormFieldCard>
            <div className="space-y-2">
              <Label>{t('prompts.fields.name')}:</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('common.placeholders.enter_field', { field: t('prompts.fields.name') })}
                className="bg-muted"
              />
            </div>
          </FormFieldCard>

          <FormFieldCard>
            <div className="space-y-2">
              <Label>{t('prompts.fields.prompt')}:</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder={t('common.placeholders.enter_optional', { field: t('prompts.fields.prompt') })}
              />
            </div>
          </FormFieldCard>

          <FormFieldCard>
            <div className="space-y-2">
              <Label>{t('prompts.fields.note')}:</Label>
              <Input
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder={t('common.placeholders.enter_optional', { field: t('prompts.fields.note') })}
                className="bg-muted"
              />
            </div>
          </FormFieldCard>
        </>
      }
    />
  );
}