'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { TopicCategory, TopicSubcategory } from './page';
import { createTopic } from './actions';
import { CategorySelector } from './components/category-selector';
import { SubcategorySelector } from './components/subcategory-selector';
import { LanguageSelector } from '../knowledge/components/language-selector';
import { FormFieldCard } from '../knowledge/components/form-field-card';
import { useHydrationSafeTranslation } from '@/hooks/use-hydration-safe-translation';
import { useToast } from '@/components/ui/toast';

interface AddTopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TopicCategory[];
  subcategories: TopicSubcategory[];
  currentLanguage: string;
}

interface FormData {
  category_id: string;
  subcategory_id: string;
  language: 'en' | 'zh' | 'vi';
  content: string;
}

export function AddTopicDialog({ 
  open, 
  onOpenChange, 
  categories,
  subcategories,
  currentLanguage 
}: AddTopicDialogProps) {
  const { t } = useHydrationSafeTranslation();
  const { addToast } = useToast();
  
  // 状态管理
  const [formData, setFormData] = useState<FormData>({
    category_id: '',
    subcategory_id: '',
    language: 'en',
    content: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 重置表单
  const resetForm = () => {
    setFormData({
      category_id: '',
      subcategory_id: '',
      language: 'en',
      content: '',
    });
  };

  // 当 Category 改变时重置 Subcategory 选择
  const handleCategoryChange = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      category_id: categoryId,
      subcategory_id: '', // 重置子分类选择
    }));
  };

  // 表单验证
  const validateForm = (): string | null => {
    if (!formData.category_id) return t('common.validation.select_required', { field: t('topics.labels.category') });
    if (!formData.subcategory_id) return t('common.validation.select_required', { field: t('topics.labels.subcategory') });
    if (!formData.content?.trim()) return t('common.validation.field_required', { field: t('topics.fields.content') });
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
      const result = await createTopic({
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id,
        language: formData.language,
        content: formData.content.trim(),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('common.patterns.add_item', { item: t('topics.item_name') })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1">
          {/* Category 选择器 */}
          <CategorySelector
            value={formData.category_id}
            onChange={handleCategoryChange}
            categories={categories}
            currentLanguage={currentLanguage}
          />

          {/* Subcategory 选择器 */}
          <SubcategorySelector
            value={formData.subcategory_id}
            onChange={(value: string) => setFormData(prev => ({ ...prev, subcategory_id: value }))}
            subcategories={subcategories}
            selectedCategoryId={formData.category_id}
            currentLanguage={currentLanguage}
          />

          {/* Language 选择器 */}
          <LanguageSelector
            value={formData.language}
            onChange={(value: 'en' | 'zh' | 'vi') => setFormData(prev => ({ ...prev, language: value }))}
          />

          {/* Content 输入 */}
          <FormFieldCard>
            <div className="space-y-2">
              <Label>{t('topics.fields.content')}:</Label>
              <Textarea
                value={formData.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder={t('common.placeholders.enter_field', { field: t('topics.fields.content') })}
                className="min-h-[120px] resize-none bg-muted"
              />
            </div>
          </FormFieldCard>
        </div>

        {/* 底部按钮 */}
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
      </DialogContent>
    </Dialog>
  );
}
