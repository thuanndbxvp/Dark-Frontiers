import React, { useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE_MB = 4;

interface MultiImageUploaderProps {
  onImagesChange: (base64Images: string[]) => void;
  imagePreviewUrls: string[];
}

export const ImageUploader: React.FC<MultiImageUploaderProps> = ({
  onImagesChange,
  imagePreviewUrls,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    if (files.length + imagePreviewUrls.length > MAX_IMAGES) {
        alert(`Bạn chỉ có thể tải lên tối đa ${MAX_IMAGES} ảnh.`);
        return;
    }

    const newImages: string[] = [...imagePreviewUrls];
    // FIX: Explicitly type `file` as `File` to resolve type errors on `file.size`, `file.name`, and when passing to `readAsDataURL`.
    const filePromises = Array.from(files).map((file: File) => {
      return new Promise<void>((resolve, reject) => {
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          alert(`Kích thước file ảnh "${file.name}" không được vượt quá ${MAX_FILE_SIZE_MB}MB.`);
          return reject();
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push(reader.result as string);
          resolve();
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then(() => {
        onImagesChange(newImages);
    }).catch(err => {
        console.error("Error reading files:", err);
    });

    // Reset input to allow re-uploading the same file
    event.target.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = (indexToRemove: number) => {
    onImagesChange(imagePreviewUrls.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        multiple
        disabled={imagePreviewUrls.length >= MAX_IMAGES}
      />
      <label className="block text-sm font-semibold text-text-primary mb-2">Ảnh tham chiếu (Tùy chọn)</label>
      
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
          {imagePreviewUrls.map((url, index) => (
              <div key={index} className="relative group aspect-square">
                  <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-lg border border-border" />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                      <button
                          onClick={() => handleRemoveImage(index)}
                          className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-full transition-transform hover:scale-110"
                          aria-label="Remove image"
                      >
                          <TrashIcon className="w-5 h-5" />
                      </button>
                  </div>
              </div>
          ))}
      </div>

      {imagePreviewUrls.length < MAX_IMAGES && (
         <button
            onClick={triggerFileInput}
            className="w-full flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent rounded-lg p-6 transition-colors"
          >
            <UploadIcon className="w-8 h-8 text-text-secondary mb-2" />
            <span className="text-sm text-text-primary font-semibold">Tải lên ảnh</span>
            <span className="text-xs text-text-secondary mt-1">PNG, JPG, WEBP (Tối đa {MAX_FILE_SIZE_MB}MB, còn lại {MAX_IMAGES - imagePreviewUrls.length})</span>
          </button>
      )}

      <p className="text-xs text-text-secondary mt-1">Cung cấp ảnh để AI học theo phong cách (màu sắc, không khí...).</p>
    </div>
  );
};
