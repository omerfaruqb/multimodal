import React, { useEffect, useState, useRef } from 'react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import useImageUploadStore from '../../lib/stores/imageUploadStore';
import ImageUpload from '../image-upload/ImageUpload';
import './ImageChat.scss';
import { Part } from '@google/generative-ai';
import { FiLoader } from 'react-icons/fi';

const ImageChat: React.FC = () => {
  const { client, setConfig } = useLiveAPIContext();
  const { images } = useImageUploadStore();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string, isHidden?: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousImagesLength = useRef(0);

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "text",
      },
      systemInstruction: {
        parts: [
          {
            text: 'You are a helpful assistant that can analyze images and provide detailed descriptions and insights about them.',
          },
        ],
      },
    });
  }, [setConfig]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Watch for new image uploads
  useEffect(() => {
    if (images.length > previousImagesLength.current) {
      handleImageAnalysis();
    }
    previousImagesLength.current = images.length;
  }, [images.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const convertImagesToBase64 = async () => {
    return Promise.all(
      images.map(async (img) => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            resolve(base64String.split(',')[1]);
          };
          reader.readAsDataURL(img.file);
        });

        return {
          inlineData: {
            data: base64,
            mimeType: img.file.type
          }
        };
      })
    );
  };

  const handleImageAnalysis = async () => {
    if (images.length === 0) return;

    setIsLoading(true);
    try {
      const imageParts = await convertImagesToBase64();
      const parts: Part[] = [
        ...imageParts,
        { text: "Çöz!" }
      ];

      // Add hidden user message
      setMessages([{ 
        role: 'user', 
        content: "Çöz!",
        isHidden: true
      }]);

      let currentResponse = '';
      
      const onContent = (content: any) => {
        if ('modelTurn' in content && content.modelTurn?.parts?.[0]?.text) {
          currentResponse += content.modelTurn.parts[0].text;
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = currentResponse;
              return [...newMessages];
            } else {
              return [...newMessages, { role: 'assistant', content: currentResponse }];
            }
          });
        }
      };

      const onTurnComplete = () => {
        setIsLoading(false);
        client.off('content', onContent);
        client.off('turncomplete', onTurnComplete);
      };

      client.on('content', onContent);
      client.on('turncomplete', onTurnComplete);
      client.send(parts, true);

    } catch (error) {
      console.error('Error processing image:', error);
      setMessages([{ role: 'assistant', content: 'Error processing image. Please try again.' }]);
      setIsLoading(false);
    }
  };

  const ImagePreview = () => {
    if (images.length === 0) return null;
    
    return (
      <div className="images-preview">
        {images.map((image, index) => (
          <div key={image.id} className="image-preview-item">
            <img src={image.preview} alt={`Uploaded ${index + 1}`} />
          </div>
        ))}
      </div>
    );
  };

  const visibleMessages = messages.filter(message => !message.isHidden);

  return (
    <div className="image-chat">
      <div className="setup-section">
        <div className="upload-section">
          <ImageUpload />
        </div>
        {isLoading && (
          <div className="loading-overlay">
            <FiLoader className="loading-icon" />
            <span>Çözülüyor...</span>
          </div>
        )}
        {visibleMessages.length > 0 && !isLoading && (
          <div className="answer-section">
            <ImagePreview />
            <div className="messages-container">
              {visibleMessages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  <div className="message-content">
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageChat; 