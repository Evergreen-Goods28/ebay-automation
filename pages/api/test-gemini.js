import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  const modelsToTry = [
    'gemini-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro',
    'models/gemini-pro',
    'models/gemini-1.5-pro'
  ];
  
  const results = {};
  
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello');
      const response = await result.response;
      results[modelName] = '✅ WORKS';
    } catch (error) {
      results[modelName] = `❌ ${error.message.substring(0, 50)}`;
    }
  }
  
  return res.json(results);
}
