import { GoogleGenerativeAI, Part } from '@google/generative-ai';

// Initialize Google AI client
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GOOGLE_API_KEY || '');

export interface ProcessedImage {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export const processImages = async (files: File[]): Promise<ProcessedImage[]> => {
  return Promise.all(
    files.map(async (file) => {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      return {
        inlineData: {
          data: base64,
          mimeType: file.type
        }
      };
    })
  );
};

export const getAIResponse = async (
  question: string, 
  images: ProcessedImage[]
): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const prompt = {
      text: `You are a helpful tutor. Provide detailed, accurate, and easy-to-understand answers. 
      Explain concepts thoroughly but avoid showing your internal reasoning process. 
      If you're not completely sure about something, say so.
      
      Student question: ${question}`
    };

    const parts: Part[] = [prompt];
    if (images && images.length > 0) {
      parts.push(...images);
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    throw new Error(`Error getting AI response: ${error}`);
  }
}; 