import React, { useEffect, useState, useRef } from 'react';
import { useImageChatContext } from '../../contexts/ImageChatContext';
import useImageUploadStore from '../../lib/stores/imageUploadStore';
import ImageUpload from '../image-upload/ImageUpload';
import './ImageChat.scss';
import { Part } from '@google/generative-ai';
import { FiLoader } from 'react-icons/fi';
import { processImages, getAIResponse } from '../../services/imageProcessingService';
import { AIResponse } from '../../App';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ImageChatProps {
  aiResponse: AIResponse | null;
  onAIResponse: (response: string, imageData?: { base64: string; mimeType: string }) => void;
}

const ImageChat: React.FC<ImageChatProps> = ({ aiResponse, onAIResponse }) => {
  const { client, connected } = useImageChatContext();
  const { images } = useImageUploadStore();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string, isHidden?: boolean, isFinal?: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousImagesLength = useRef(0);
  const lastResponseTimestamp = useRef<number>(0);
  const [finalAnswer, setFinalAnswer] = useState<string>('');
  const previousConnectedState = useRef(connected);

  // Handle initial connection and AI response
  useEffect(() => {
    if (connected && !previousConnectedState.current && aiResponse) {
      // Send initial context when streaming starts
      const parts = [];

      // Add the initial response prompt
      parts.push({
        text: `⁠User has sent you a question; use the provided solution to answer it. 
        The original question is also given as image input to you. Before starting to solve the problem, 
        ask the user if he/she has any spesific questions about the problem.
        Solution: ${aiResponse.content}`
      });

      // Add the image if available
      if (aiResponse.imageData) {
        parts.push({
          inlineData: {
            data: aiResponse.imageData.base64,
            mimeType: aiResponse.imageData.mimeType
          }
        });
      }

      // Send both text and image
      client.send(parts, true);
    }
    previousConnectedState.current = connected;
  }, [connected, aiResponse, client]);

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
      setFinalAnswer(aiResponse.content);
      handleStreamResponse(aiResponse.content, true);
    }
  }, [aiResponse]);

  const handleImageProcessing = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    try {
      const processedImages = await processImages(images.map(img => img.file));
      const response = await getAIResponse("Please solve this problem and explain in detail.", processedImages); 
      
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
    
    // Add LaTeX formatting for piecewise functions
    const formattedResponse = response.replace(
      /h_(\d)\(x\)\s*=\s*\\begin\s*{cases}/g,
      '$$h_$1(x) = \\begin{cases}'
    ).replace(/\\end{cases}/g, '\\end{cases}$$');
    
    // Directly set the complete response without artificial delays
    setMessages([{ 
      role: 'assistant', 
      content: formattedResponse.trim(), 
      isFinal: true 
    }]);
    
    setIsLoading(false);
  };

  const formatMathText = (text: string) => {
    try {
      // First, protect inline math with $ signs
      text = text.replace(/\$([^$]+?)\$/g, (match, content) => {
        try {
          return katex.renderToString(content.trim(), {
            displayMode: false,
            throwOnError: false
          });
        } catch (e) {
          console.error('KaTeX error:', e);
          return content;
        }
      });

      // Handle piecewise functions
      text = text.replace(
        /h\(x\)\s*=\s*\{([^}]+)\}/g,
        `$$h(x) = \\begin{cases} f(x), & x \\geq -1 \\\\ g(x), & x < -1 \\end{cases}$$`
      );

      // Handle display math
      text = text.replace(/\$\$(.*?)\$\$/gs, (match, content) => {
        try {
          return katex.renderToString(content.trim(), {
            displayMode: true,
            throwOnError: false
          });
        } catch (e) {
          console.error('KaTeX error:', e);
          return content;
        }
      });

      // Format bullet points
      text = text.replace(/^•\s*(.+)$/gm, '<li>$1</li>');
      text = text.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

      // Format headers
      text = text.replace(/^###\s*(.+)$/gm, '<h3>$1</h3>');

      return text;
    } catch (e) {
      console.error('Error in formatMathText:', e);
      return text;
    }
  };

  // Only show final messages
  // const visibleMessages = messages.filter(message => !message.isHidden && message.isFinal);

  return (
    <div className="image-chat">
      <div className="main-content">
        <div className="setup-section">
          {images.length === 0 && (
            <div className="upload-section">
              <ImageUpload />
            </div>
          )}
          <div className="answer-section">
            {images.length > 0 && (
              <div className="images-preview">
                <div className="image-preview-item">
                  <img src={images[images.length - 1].preview} alt="Uploaded image" />
                </div>
              </div>
            )}
          </div>
          {(isLoading || isProcessing) && (
            <div className="loading-overlay">
              <FiLoader className="loading-icon" />
              <span>{isProcessing ? 'Processing image...' : 'Generating solution...'}</span>
            </div>
          )}
        </div>
      </div>
      <div className="side-panel">
        {images.length === 0 ? (
          <div className="initial-message">
            Upload an image to get started
          </div>
        ) : (
          <div className="analysis-content">
            <div className="final-answer-container">
              <h3>Analysis</h3>
              <div 
                className="final-answer-content"
                dangerouslySetInnerHTML={{ 
                  __html: finalAnswer ? formatMathText(finalAnswer) : 'Solving...'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageChat; 