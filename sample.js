const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google AI client
const genAI = new GoogleGenerativeAI('AIzaSyCM2eznSZWeaLslbSxhXPE8QJJw6X1GV8w');

async function fileToGenerativePart(imagePath) {
    const imageBuffer = await fs.readFile(imagePath);
    return {
        inlineData: {
            data: Buffer.from(imageBuffer).toString('base64'),
            mimeType: 'image/jpeg'
        }
    };
}

async function loadImagesFromDirectory(directory = 'input_images') {
    try {
        await fs.mkdir(directory, { recursive: true });
        const files = await fs.readdir(directory);
        const images = [];
        
        for (const file of files) {
            if (file.toLowerCase().match(/\.(jpg|jpeg|png)$/)) {
                const imagePath = path.join(directory, file);
                try {
                    const generativePart = await fileToGenerativePart(imagePath);
                    images.push(generativePart);
                } catch (error) {
                    console.error(Error loading ${file}: ${error});
                }
            }
        }
        return images;
    } catch (error) {
        console.error(Directory error: ${error});
        return [];
    }
}

async function getAIResponse(question, images = null) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        
        const prompt = {
            text: `You are a helpful tutor. Provide detailed, accurate, and easy-to-understand answers. 
            Explain concepts thoroughly but avoid showing your internal reasoning process. 
            If you're not completely sure about something, say so.
            
            Student question: ${question}`
        };

        const parts = [prompt];
        if (images && images.length > 0) {
            parts.push(...images);
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }],
        });

        const response = await result.response;
        return response.text();
    } catch (error) {
        return Error getting response: ${error.message};
    }
}

async function main() {
    try {
        const images = await loadImagesFromDirectory();
        const question = "can you help me with the question i sent you?";
        const answer = await getAIResponse(question, images);
        console.log("\nAnswer:", answer);
    } catch (error) {
        console.error("Main error:", error);
    }
}

main();