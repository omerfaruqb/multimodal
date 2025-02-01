import React, { useEffect, useState, useRef } from 'react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import useImageUploadStore from '../../lib/stores/imageUploadStore';
import ImageUpload from '../image-upload/ImageUpload';
import './ImageChat.scss';
import { Part } from '@google/generative-ai';
import { FiLoader } from 'react-icons/fi';
import { processImages, getAIResponse } from '../../services/imageProcessingService';
import { AIResponse } from '../../App';

interface ImageChatProps {
  aiResponse: AIResponse | null;
  onAIResponse: (response: string, imageData?: { base64: string; mimeType: string }) => void;
}

const ImageChat: React.FC<ImageChatProps> = ({ aiResponse, onAIResponse }) => {
  const { client, setConfig } = useLiveAPIContext();
  const { images } = useImageUploadStore();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string, isHidden?: boolean, isFinal?: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousImagesLength = useRef(0);
  const lastResponseTimestamp = useRef<number>(0);

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Fenrir"
            }
          }
        }
      },
      systemInstruction: {
        parts: [
          {
            text: 'You are a helpful assistant. You can analyze images and provide detailed descriptions and insights.',
          },
        ],
      },
    });
  }, [setConfig]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (images.length > previousImagesLength.current) {
      handleImageProcessing();
    }
    previousImagesLength.current = images.length;
  }, [images.length]);

  // Start streaming when new AI response is available
  useEffect(() => {
    if (aiResponse && aiResponse.timestamp > lastResponseTimestamp.current) {
      lastResponseTimestamp.current = aiResponse.timestamp;
      const finalResponse = `Image Analysis Result:\n\n${aiResponse.content}`;
      handleStreamResponse(finalResponse, true);
    }
  }, [aiResponse]);

  const handleImageProcessing = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    try {
      const processedImages = await processImages(images.map(img => img.file));
      const response = await getAIResponse("Please solve this problem and explain in detail", processedImages);
      
      // Get the base64 data of the latest image
      const latestImage = images[images.length - 1];
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String.split(',')[1]);
        };
        reader.readAsDataURL(latestImage.file);
      });

      // Send response and image data to parent component
      onAIResponse(response, {
        base64: base64Data,
        mimeType: latestImage.file.type
      });

      // Set initial hidden message
      setMessages([{ 
        role: 'assistant', 
        content: 'Processing image...', 
        isHidden: true 
      }]);

    } catch (error) {
      console.error('Error processing image:', error);
      setMessages([{ 
        role: 'assistant', 
        content: 'An error occurred while processing the image. Please try again.',
        isFinal: true
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStreamResponse = (response: string, isFinal: boolean) => {
    setIsLoading(true);
    let currentResponse = '';
    const words = response.split(' ');
    
    words.forEach((word, index) => {
      setTimeout(() => {
        currentResponse += word + ' ';
        setMessages(prev => {
          // Only show messages marked as final
          if (isFinal) {
            return [{ 
              role: 'assistant', 
              content: currentResponse.trim(), 
              isFinal: true 
            }];
          }
          return prev;
        });

        if (index === words.length - 1) {
          setIsLoading(false);
        }
      }, index * 50);
    });
  };

  // Only show final messages
  const visibleMessages = messages.filter(message => !message.isHidden && message.isFinal);

  return (
    <div className="image-chat">
      <div className="setup-section">
        <div className="upload-section">
          <ImageUpload />
        </div>
        <div className="answer-section">
          {images.length > 0 && (
            <div className="images-preview">
              <div className="image-preview-item">
                <img src={images[images.length - 1].preview} alt="Uploaded image" />
              </div>
            </div>
          )}
          <div className="messages-container">
            {visibleMessages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        {(isLoading || isProcessing) && (
          <div className="loading-overlay">
            <FiLoader className="loading-icon" />
            <span>{isProcessing ? 'Processing image...' : 'Generating analysis...'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageChat; 