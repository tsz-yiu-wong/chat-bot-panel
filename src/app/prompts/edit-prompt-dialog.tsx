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

import { PromptStage, Prompt } from './page';
import { updatePrompt } from './actions';
import { FormFieldCard } from '../knowledge/components/form-field-card';
import { StageSelector } from './components/stage-selector';
import { LanguageSelector } from '../knowledge/components/language-selector';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';

interface EditPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: Prompt | null;
  stages: PromptStage[];
}

interface FormData {
  name: string;
  language: 'en' | 'zh' | 'vi';
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
  
  // 状态管理
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
    if (!prompt) return t('common.validation.select_required', { field: t('prompts.entity.stage') });
    if (!formData.name?.trim()) return t('common.validation.field_required', { field: t('prompts.fields.name') });
    return null;
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!prompt) return;

    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
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

  if (!prompt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('prompts.dialogs.edit')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stage (Disabled) */}
          <StageSelector
            stages={stages}
            value={prompt.stage_id || ''}
            onChange={() => {}} // 禁用状态，不需要处理变化
            disabled={true}
          />

          {/* Language */}
          <LanguageSelector
            value={formData.language}
            onChange={(language) => setFormData(prev => ({ ...prev, language }))}
          />

          {/* Name */}
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

          {/* Prompt */}
          <FormFieldCard>
            <div className="space-y-2">
              <Label>{t('prompts.fields.prompt')}:</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-muted px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder={t('prompts.placeholders.enter_prompt')}
              />
            </div>
          </FormFieldCard>

          {/* Note */}
          <FormFieldCard>
            <div className="space-y-2">
              <Label>{t('prompts.fields.note')}:</Label>
              <Input
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder={t('prompts.placeholders.enter_note')}
                className="bg-muted"
              />
            </div>
          </FormFieldCard>

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
