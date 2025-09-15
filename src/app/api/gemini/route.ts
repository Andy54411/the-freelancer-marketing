import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}
const genAI = new GoogleGenerativeAI(apiKey);

// Retry function with exponential backoff
async function _retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2, // Reduced from 3 to save quota
  baseDelay: number = 2000 // Increased from 1000ms
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on 4xx errors (client errors) except rate limits
      if (error instanceof Error && error.message.includes('[4') && !error.message.includes('429')) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // For rate limits, wait longer
      const isRateLimit = error instanceof Error && error.message.includes('429');
      const delay = isRateLimit ? 40000 : baseDelay * Math.pow(2, attempt); // 40s for rate limits
      
      console.log(`Retry attempt ${attempt + 1} after ${delay}ms (Rate limit: ${isRateLimit})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export async function POST(request: NextRequest) {
  console.log('🚀 Gemini API called');
  
  try {
    const { prompt } = await request.json();
    console.log('📝 Prompt received:', prompt ? 'Yes' : 'No');

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('🤖 Initializing Gemini model...');
    
    // Optimized Flash model with timeout and smaller config
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200, // Reduced from 1024
        topP: 0.8,
        topK: 20
      }
    });

    console.log('📤 Sending request to Gemini...');
    
    // Direct call with optimized settings
    const result = await model.generateContent(prompt);
    console.log('📥 Gemini response received');
    
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini API Success, response length:', text.length);
    console.log('📋 Response preview:', text.substring(0, 100) + '...');
    
    return NextResponse.json({ 
      success: true, 
      response: text,
      modelUsed: 'gemini-1.5-flash'
    });

  } catch (error) {
    console.error('❌ Gemini API Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    
    return NextResponse.json(
      { 
        error: 'Fehler bei der KI-Generierung',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}