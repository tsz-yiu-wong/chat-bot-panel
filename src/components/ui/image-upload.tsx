'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { BotImage } from '@/lib/types/bot-personality'
import { getLabel, Language, IMAGE_TYPE_LABELS } from '@/lib/bot-personality-lang'

interface ImageUploadProps {
  botId: string
  imageType: 'personal' | 'lifestyle' | 'work' | 'hobby' | 'travel'
  images: BotImage[]
  onImagesChange: (images: BotImage[]) => void
  language: Language
  maxImages?: number
}

export default function ImageUpload({
  botId,
  imageType,
  images,
  onImagesChange,
  language,
  maxImages = 10
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const typeLabel = IMAGE_TYPE_LABELS[imageType]?.[language] || imageType

  // 上传图片
  const uploadImages = useCallback(async (files: FileList) => {
    if (files.length === 0) return

    setUploading(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('bot_id', botId)
        formData.append('image_type', imageType)

        const response = await fetch('/api/bot-personality/images', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        const result = await response.json()
        return result.image
      })

      const newImages = await Promise.all(uploadPromises)
      onImagesChange([...images, ...newImages])
    } catch (error) {
      console.error('Error uploading images:', error)
      alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setUploading(false)
    }
  }, [botId, imageType, images, onImagesChange])

  // 删除图片
  const deleteImage = useCallback(async (imageId: string) => {
    try {
      const response = await fetch(`/api/bot-personality/images?id=${imageId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete image')
      }

      onImagesChange(images.filter(img => img.id !== imageId))
    } catch (error) {
      console.error('Error deleting image:', error)
      alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }, [images, onImagesChange])

  // 更新图片描述
  const updateImageDescription = useCallback(async (imageId: string, description: string) => {
    try {
      const response = await fetch('/api/bot-personality/images', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: imageId, description })
      })

      if (!response.ok) {
        throw new Error('Failed to update image description')
      }

      const result = await response.json()
      onImagesChange(images.map(img => 
        img.id === imageId ? result.image : img
      ))
    } catch (error) {
      console.error('Error updating image description:', error)
    }
  }, [images, onImagesChange])

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadImages(e.target.files)
    }
  }

  // 处理拖拽
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    if (e.dataTransfer.files) {
      uploadImages(e.dataTransfer.files)
    }
  }

  const canUploadMore = images.length < maxImages

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{typeLabel}</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {images.length} / {maxImages}
        </span>
      </div>

      {/* 上传区域 */}
      {canUploadMore && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${dragOver 
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
            }
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="space-y-2">
            <div className="text-gray-600 dark:text-gray-300">
              {uploading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  <span>上传中...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl">📸</div>
                  <p>{getLabel('upload', language)} {typeLabel}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'zh' 
                      ? '点击选择文件或拖拽图片到此处' 
                      : 'Nhấp để chọn tệp hoặc kéo thả hình ảnh vào đây'
                    }
                  </p>
                </>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* 图片列表 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              {/* 图片 */}
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                <Image
                  src={image.image_url}
                  alt={image.description || 'Uploaded image'}
                  layout="fill"
                  objectFit="cover"
                  className="w-full h-full"
                />
              </div>

              {/* 悬浮操作按钮 */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const description = prompt('输入图片描述:', image.description || '')
                      if (description !== null && image.id) {
                        updateImageDescription(image.id, description)
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    {getLabel('edit', language)}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('确定删除这张图片吗？') && image.id) {
                        deleteImage(image.id)
                      }
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    {getLabel('delete', language)}
                  </button>
                </div>
              </div>

              {/* 图片描述 */}
              {image.description && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded-b-lg">
                  {image.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {images.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">🖼️</div>
          <p>{language === 'zh' ? '还没有上传任何图片' : 'Chưa có hình ảnh nào được tải lên'}</p>
        </div>
      )}
    </div>
  )
} 