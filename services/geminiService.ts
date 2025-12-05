import { GoogleGenAI } from "@google/genai";

/**
 * Analyzes an image using the Gemini 2.5 Flash model.
 * 
 * @param base64Data The base64 encoded string of the image.
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg', 'image/png').
 * @returns The generated text description.
 */
export const analyzeImage = async (base64Data: string, mimeType: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: "Analyze this image in detail. Describe the main subject, the setting, lighting, colors, and any interesting details. If there is text, transcribe it.",
          },
        ],
      },
    });

    return response.text || "No description available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze image. Please try again.");
  }
};
