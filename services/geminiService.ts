
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      description: "A score from 0 to 100 representing how well the resume matches the job description.",
    },
    overview: {
      type: Type.STRING,
      description: "A concise executive summary paragraph (2-3 sentences) evaluating the candidate's fit.",
    },
    strengths: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: "A list of specific keywords, skills, or sentences found in the resume that perfectly match the job description requirements.",
    },
    improvements: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: "A list of specific keywords to add, or specific sentences that need to be rephrased or replaced to better align with the job description.",
    }
  },
  required: ["score", "overview", "strengths", "improvements"],
};

export const analyzeResume = async (resumeText: string, jobDescription: string): Promise<AnalysisResult> => {
  const prompt = `
    You are an expert career coach and professional resume reviewer. Your task is to analyze a resume against a specific job description and provide structured, actionable feedback.

    Analyze the following resume content and job description.

    **Resume:**
    ---
    ${resumeText}
    ---

    **Job Description:**
    ---
    ${jobDescription}
    ---

    Based on your analysis, provide a JSON response with the following structure:
    
    1. **score**: A 0-100 match score.
    2. **overview**: A brief summary paragraph of the candidate's suitability.
    3. **strengths**: A distinct list of **exact keywords or sentences** from the resume that meet the expected criteria.
    4. **improvements**: A distinct list of **keywords or sentences** that require replacement or addition. 
       - For missing keywords, specify "Add [Keyword]".
       - For weak sentences, specify "Replace [Weak Phrase] with [Stronger Alternative]".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2,
      },
    });

    const jsonText = response.text.trim();
    const parsedResult = JSON.parse(jsonText) as AnalysisResult;
    return parsedResult;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};
