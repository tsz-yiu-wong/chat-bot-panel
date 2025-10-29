'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { PromptStage } from './page';
import { createPrompt } from './actions';
import { BaseFormDialog } from '@/components/shared/base-form-dialog';
import { FormFieldCard } from '@/components/shared/form-field-card';
import { StageSelector } from './selector-stag';
import { LanguageSelector } from '@/components/shared/language-selector';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { useToast } from '@/components/ui/toast';

interface AddPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PromptStage[];
}

interface FormData {
  name: string;
  stage_id: string;
  language: string;
  prompt: string;
  note: string;
}

export function AddPromptDialog({ 
  open, 
  onOpenChange, 
  stages
}: AddPromptDialogProps) {
  const { t } = useHydrationSafeTranslation();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    stage_id: '',
    language: 'en',
    prompt: '',
    note: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      stage_id: '',
      language: 'en',
      prompt: '',
      note: '',
    });
  };

  // 表单验证
  const validateForm = (): string | null => {
    if (!formData.name?.trim()) return t('common.validation.field_required', { field: t('prompts.fields.name') });
    if (!formData.stage_id) return t('common.validation.select_required', { field: t('prompts.labels.stage') });
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
      const result = await createPrompt({
        name: formData.name.trim(),
        stage_id: formData.stage_id,
        language: formData.language,
        prompt: formData.prompt.trim() || undefined,
        mark: formData.note.trim() || undefined,
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
      title={t('common.patterns.add_item', { item: t('prompts.item_name') })}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      selectors={
        <>
          <StageSelector
            stages={stages}
            value={formData.stage_id}
            onChange={(stageId) => setFormData(prev => ({ ...prev, stage_id: stageId }))}
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