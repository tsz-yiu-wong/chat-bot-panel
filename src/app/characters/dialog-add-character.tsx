'use client';

import { useState } from 'react';

import { createCharacter } from './actions';
import { BaseFormDialog } from '@/components/shared/base-form-dialog';
import { LanguageSelector } from '@/components/shared/language-selector';
import { FormFieldCard } from '@/components/shared/form-field-card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { useToast } from '@/components/ui/toast';
import { language_type } from './page';

interface AddCharacterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  language: language_type;
  name: string;
}

export function AddCharacterDialog({ open, onOpenChange }: AddCharacterDialogProps) {
  const { t } = useHydrationSafeTranslation();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    language: 'en',
    name: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resetForm = () => {
    setFormData({
      language: 'en',
      name: '',
    });
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return t('common.validation.field_required', { field: t('characters.fields.name') });
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      addToast('warning', validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createCharacter({
        language: formData.language,
        name: formData.name.trim(),
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

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('common.patterns.add_item', { item: t('characters.item_name') })}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      selectors={
        <div className="flex items-center gap-2">
          <Label className="whitespace-nowrap">{t('characters.language_label')}:</Label>
          <LanguageSelector
            value={formData.language}
            onChange={(value: language_type) => setFormData(prev => ({ ...prev, language: value }))}
            showLabel={false}
          />
        </div>
      }
      formFields={
        <FormFieldCard>
          <div className="space-y-2">
            <Label>{t('characters.fields.name')}:</Label>
            <Input
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('common.placeholders.enter_field', { field: t('characters.fields.name') })}
              className="bg-muted"
            />
          </div>
        </FormFieldCard>
      }
    />
  );
}
