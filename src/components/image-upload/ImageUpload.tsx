import React, { useCallback, useState } from 'react';
import { ImageUploadConfig } from '../../multimodal-live-types';
import useImageUploadStore from '../../lib/stores/imageUploadStore';
import './ImageUpload.scss';
import classNames from 'classnames';
import { FiUpload, FiX } from 'react-icons/fi';

const DEFAULT_CONFIG: ImageUploadConfig = {
  maxSizeInMB: 10,
  acceptedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  multiple: true
};

interface Props {
  config?: Partial<ImageUploadConfig>;
  className?: string;
}

const ImageUpload: React.FC<Props> = ({ config = {}, className }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { images, addImages, removeImage } = useImageUploadStore();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFiles = (files: FileList): boolean => {
    return Array.from(files).every(file => {
      const isValidType = finalConfig.acceptedFileTypes.includes(file.type);
      const isValidSize = file.size <= finalConfig.maxSizeInMB * 1024 * 1024;
      return isValidType && isValidSize;
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const { files } = e.dataTransfer;
    if (files && files.length > 0 && validateFiles(files)) {
      addImages(files);
    }
  }, [addImages]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && validateFiles(files)) {
      addImages(files);
    }
  }, [addImages]);

  return (
    <div className={classNames('image-upload-container', className)}>
      <div
        className={classNames('image-upload-dropzone', { dragging: isDragging })}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <FiUpload className="upload-icon" />
        <p>Drag and drop images here or</p>
        <input
          type="file"
          accept={finalConfig.acceptedFileTypes.join(',')}
          multiple={finalConfig.multiple}
          onChange={handleFileInput}
          id="file-input"
          className="file-input"
        />
        <label htmlFor="file-input" className="file-input-label">
          Browse Files
        </label>
        <p className="file-requirements">
          Accepted formats: {finalConfig.acceptedFileTypes.map(type => type.split('/')[1]).join(', ')}
          <br />
          Max size: {finalConfig.maxSizeInMB}MB
        </p>
      </div>

      {images.length > 0 && (
        <div className="image-preview-grid">
          {images.map((image) => (
            <div key={image.id} className="image-preview-item">
              <img src={image.preview} alt={image.file.name} />
              <button
                className="remove-image"
                onClick={() => removeImage(image.id)}
                title="Remove image"
              >
                <FiX />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload; 