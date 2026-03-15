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
```

5. Click **"Commit new file"**

---

## **STEP 2: Wait for Vercel to Deploy**

1. Go to: **https://vercel.com/dashboard**
2. Click **"ebay-automation"**
3. Click **"Deployments"** tab
4. Wait until status shows **"Ready"** (2-3 minutes)

---

## **STEP 3: Run the Test**

1. Open this URL in your browser:
```
   https://ebay-automation-k3ti.vercel.app/api/test-gemini
