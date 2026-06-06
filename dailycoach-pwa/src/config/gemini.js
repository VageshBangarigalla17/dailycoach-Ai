import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY is not defined in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || 'placeholder');
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export default geminiModel;
