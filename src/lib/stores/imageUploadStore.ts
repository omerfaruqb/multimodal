import { create } from 'zustand';
import { ImageFile, ImageUploadState } from '../../multimodal-live-types';

const useImageUploadStore = create<ImageUploadState>((set) => ({
  images: [],
  addImages: (files: FileList) => {
    set((state) => {
      const newImages: ImageFile[] = Array.from(files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        id: `${file.name}-${Date.now()}`
      }));
      return { images: [...state.images, ...newImages] };
    });
  },
  removeImage: (id: string) => {
    set((state) => {
      const filteredImages = state.images.filter((img) => img.id !== id);
      // Cleanup object URL to prevent memory leaks
      const removedImage = state.images.find((img) => img.id === id);
      if (removedImage) {
        URL.revokeObjectURL(removedImage.preview);
      }
      return { images: filteredImages };
    });
  },
  clearImages: () => {
    set((state) => {
      // Cleanup all object URLs
      state.images.forEach((img) => URL.revokeObjectURL(img.preview));
      return { images: [] };
    });
  }
}));

export default useImageUploadStore; 