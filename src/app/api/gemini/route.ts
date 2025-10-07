import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}
const genAI = new GoogleGenerativeAI(apiKey);

export async function GET() {
  try {
    // List available models for debugging
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      availableModels: data.models?.map((model: any) => ({
        name: model.name,
        displayName: model.displayName,
        supportedGenerationMethods: model.supportedGenerationMethods
      })) || [],
      apiKeyStatus: apiKey ? 'Present' : 'Missing',
      rawResponse: data
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch models',
      details: error instanceof Error ? error.message : String(error),
      apiKeyStatus: apiKey ? 'Present' : 'Missing'
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt ist erforderlich' }, { status: 400 });
    }

    // Try multiple models in order of preference (using actual available models)
    const modelNames = [
      'models/gemini-2.5-flash',
      'models/gemini-2.0-flash',
      'models/gemini-flash-latest',
      'models/gemini-2.5-flash-lite',
      'models/gemini-2.0-flash-lite',
      'models/gemini-pro-latest'
    ];

    let lastError: Error | null = null;
    let usedModel = '';

    for (const modelName of modelNames) {
      try {
        console.log(`Trying model: ${modelName}`);
        
        const model = genAI.getGenerativeModel({
          model: modelName,
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return NextResponse.json({
          success: true,
          response: text,
          modelUsed: modelName,
          attemptedModels: modelNames.slice(0, modelNames.indexOf(modelName) + 1)
        });
        
      } catch (modelError) {
        console.log(`Model ${modelName} failed:`, modelError instanceof Error ? modelError.message : String(modelError));
        lastError = modelError instanceof Error ? modelError : new Error(String(modelError));
      }
    }

    // If all models failed, return the last error
    throw lastError || new Error('All models failed');
    
  } catch (error) {
    console.error('Gemini API Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

    return NextResponse.json(
      {
        error: 'Fehler bei der KI-Generierung',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
