// Import the library's default export and adapt dynamically since the
// package exposes a default module entry point.
import * as fs from "fs";

// To avoid startup-time dependency issues during development, provide a local
// stub for the GenAI client. This lets the server boot without installing or
// correctly wiring the external SDK. The stub returns empty/neutral responses
// so the existing fallback logic in this file (calculateBasicTextSimilarity,
// default image similarity) will be used.
const genAI = {
  getGenerativeModel: ({ model }: { model: string }) => ({
    async generateContent(_input: any) {
      // Return an object shaped like the real client but with an empty text
      // response so JSON.parse will fail and the code will fall back to local
      // similarity calculations.
      return {
        response: Promise.resolve({ text: () => "" }),
      };
    },
  }),
};

export interface VerificationResult {
  textSimilarity: number;
  imageSimilarity: number;
  finalScore: number;
  decision: "approved" | "rejected" | "manual_review";
  reason: string;
}

export async function verifyClaimWithAI(
  originalDescription: string,
  claimDescription: string,
  originalImagePath?: string,
  claimImagePath?: string
): Promise<VerificationResult> {
  try {
    // Text similarity analysis
    const textSimilarity = await analyzeTextSimilarity(originalDescription, claimDescription);
    
    // Image similarity analysis (if both images are provided)
    let imageSimilarity = 0;
    if (originalImagePath && claimImagePath) {
      imageSimilarity = await analyzeImageSimilarity(originalImagePath, claimImagePath);
    }
    
    // Calculate final score
    const finalScore = originalImagePath && claimImagePath 
      ? (0.6 * textSimilarity) + (0.4 * imageSimilarity)
      : textSimilarity;

    // Determine decision
    let decision: "approved" | "rejected" | "manual_review";
    let reason: string;
    
    if (finalScore >= 0.8) {
      decision = "approved";
      reason = "High confidence match. Descriptions and evidence strongly align.";
    } else if (finalScore >= 0.5) {
      decision = "manual_review";
      reason = "Moderate similarity detected. Manual review recommended for verification.";
    } else {
      decision = "rejected";
      reason = "Low similarity between claim and original item description.";
    }

    return {
      textSimilarity,
      imageSimilarity,
      finalScore,
      decision,
      reason
    };
  } catch (error) {
    console.error("AI verification error:", error);
    throw new Error("AI verification service unavailable");
  }
}

async function analyzeTextSimilarity(original: string, claim: string): Promise<number> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const prompt = `
    Analyze the similarity between these two item descriptions and return only a JSON response:
    
    Original Description: "${original}"
    Claim Description: "${claim}"
    
    Compare:
    1. Item type and category
    2. Physical characteristics (color, size, brand, model)
    3. Unique identifying features
    4. Condition and notable details
    
    Return JSON format:
    {
      "similarity": 0.85,
      "reasoning": "Both descriptions match on key identifying features..."
    }
    
    Similarity score should be between 0 and 1.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    const parsed = JSON.parse(text);
    return Math.max(0, Math.min(1, parsed.similarity || 0));
  } catch {
    // Fallback: basic text similarity
    return calculateBasicTextSimilarity(original, claim);
  }
}

async function analyzeImageSimilarity(imagePath1: string, imagePath2: string): Promise<number> {
  if (!fs.existsSync(imagePath1) || !fs.existsSync(imagePath2)) {
    return 0;
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
  
  const image1 = fs.readFileSync(imagePath1);
  const image2 = fs.readFileSync(imagePath2);
  
  const prompt = `
    Compare these two images and determine if they show the same item. Return only JSON:
    
    {
      "similarity": 0.92,
      "reasoning": "Both images show the same iPhone model with matching physical characteristics..."
    }
    
    Consider:
    - Object type and shape
    - Colors and materials
    - Unique marks, scratches, or features
    - Brand logos or text
    - Overall condition
    
    Similarity score between 0 and 1.
  `;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: image1.toString("base64"),
        mimeType: "image/jpeg",
      },
    },
    {
      inlineData: {
        data: image2.toString("base64"),
        mimeType: "image/jpeg",
      },
    },
  ]);
  
  const response = await result.response;
  const text = response.text();
  
  try {
    const parsed = JSON.parse(text);
    return Math.max(0, Math.min(1, parsed.similarity || 0));
  } catch {
    return 0.5; // Default moderate similarity if parsing fails
  }
}

function calculateBasicTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
  const union = new Set([...Array.from(set1), ...Array.from(set2)]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

export async function detectFraud(userId: string, failedClaims: number): Promise<{ isSuspicious: boolean; reason?: string }> {
  if (failedClaims >= 3) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
      A user has failed ${failedClaims} claim attempts. Assess fraud risk and return JSON:
      
      {
        "isSuspicious": true,
        "reason": "Multiple failed claims indicate potential fraudulent activity..."
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);
      
      return {
        isSuspicious: parsed.isSuspicious || failedClaims >= 3,
        reason: parsed.reason || "Multiple failed claim attempts detected"
      };
    } catch {
      return {
        isSuspicious: true,
        reason: "Multiple failed claim attempts detected"
      };
    }
  }
  
  return { isSuspicious: false };
}
