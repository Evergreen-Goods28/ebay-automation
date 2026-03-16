// api/test.js
// Simple test endpoint to verify Supabase and Gemini connections

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ypwmrcerqexqgnpgrfph.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd21yY2VycWV4cWducGdyZnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzY1NzgsImV4cCI6MjA1MjU1MjU3OH0.4NTs3EDX9hVhVh69CN739A_Q2wPOcJXyH6P_example'
);

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || 'AIzaSyBNpWo73bfOGCELWLIozGG-LvP6qOkdU7Q'
);

export default async function handler(req, res) {
  const results = {
    supabase: null,
    gemini: null
  };

  // Test Supabase connection
  try {
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    results.supabase = '✅ Connected';
  } catch (error) {
    results.supabase = `❌ Error: ${error.message}`;
  }

  // Test Gemini API
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent('Say "test successful" in JSON format');
    const response = await result.response;
    const text = response.text();
    results.gemini = `✅ Connected - Response: ${text.substring(0, 50)}...`;
  } catch (error) {
    results.gemini = `❌ Error: ${error.message}`;
  }

  return res.status(200).json({
    message: 'API Test Results',
    timestamp: new Date().toISOString(),
    ...results
  });
}
