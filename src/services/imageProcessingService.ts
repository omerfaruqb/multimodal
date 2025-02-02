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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp' });
    
    const prompt = {
      text: `You are a professional mathematics tutor. Format your responses using proper LaTeX notation:

      FORMATTING RULES:
      1. Use LaTeX for ALL mathematical expressions:
         • Functions: $f(x)$, $g(x)$, $h(x)$
         • Equations: Use \\begin{equation} ... \\end{equation}
         • Inequalities: $x \\ge -1$, $x < -1$
         • Fractions: $\\frac{a}{b}$
         • Points: $(x,y)$
         • Piecewise functions: Use \\begin{cases} ... \\end{cases}
      
      2. Structure:
         • Start with "### Problem Analysis"
         • Use bullet points (•) for lists
         • Use > for important notes
         • Use --- for section breaks
      
      3. For piecewise functions, use:
         \\begin{equation}
         h(x) = \\begin{cases}
           f(x), & x \\ge -1 \\\\
           g(x), & x < -1
         \\end{cases}
         \\end{equation}

      4. For function properties, use proper notation:
         • Domains: $x \\in (-\\infty, -1)$
         • Intervals: $[-1, \\infty)$
         • Derivatives: $f'(x)$
         • Limits: $\\lim_{x \\to a}$

      Keep explanations clear and use proper mathematical notation throughout.
      
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