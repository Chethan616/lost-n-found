// Import the library's default export and adapt dynamically since the
// package exposes a default module entry point.
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";

// Initialize Gemini AI with API key from environment
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

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
      ? (0.5 * textSimilarity) + (0.5 * imageSimilarity)
      : textSimilarity;

    // Determine decision - more lenient thresholds
    let decision: "approved" | "rejected" | "manual_review";
    let reason: string;
    
    if (textSimilarity >= 0.5 || finalScore >= 0.5) {
      decision = "approved";
      reason = `Strong match detected (Text: ${Math.round(textSimilarity * 100)}%, Image: ${Math.round(imageSimilarity * 100)}%, Final: ${Math.round(finalScore * 100)}%). Claim approved.`;
    } else if (textSimilarity >= 0.3 || finalScore >= 0.35) {
      decision = "manual_review";
      reason = `Moderate similarity detected (Text: ${Math.round(textSimilarity * 100)}%, Image: ${Math.round(imageSimilarity * 100)}%). Manual review recommended.`;
    } else {
      decision = "rejected";
      reason = `Low similarity detected (Text: ${Math.round(textSimilarity * 100)}%, Image: ${Math.round(imageSimilarity * 100)}%). Please provide more specific details matching the original item.`;
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
  if (!genAI) {
    console.log("No Gemini API key provided, using fallback text similarity");
    return calculateBasicTextSimilarity(original, claim);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      You are an expert at matching lost and found item descriptions. Analyze if these descriptions refer to the SAME physical item.
      
      Original Item Description: "${original}"
      Claim Description: "${claim}"
      
      Consider:
      1. **Core Identity**: Are they describing the same TYPE of object? (e.g., phone, wallet, backpack)
      2. **Key Characteristics**: Do distinctive features match? (brand, model, color, size)
      3. **Unique Details**: Any matching serial numbers, scratches, contents, or personal marks?
      4. **Context Understanding**: Consider synonyms and paraphrasing
         - "iPhone" = "Apple phone" = "smartphone"
         - "black backpack" = "dark bag" = "black rucksack"
         - "lost my wallet with ID cards" matches "found wallet containing identification"
      5. **Forgive Minor Differences**: Claimer might not know exact model/brand
      
      IMPORTANT: Focus on whether they're describing the SAME ITEM, not exact word matching.
      Example matches:
      - "Lost iPhone 13 Pro Max, black" ↔ "Found black Apple phone, large screen"
      - "Blue Nike backpack with laptop inside" ↔ "Blue bag with computer, has swoosh logo"
      - "Silver MacBook Air with dent on corner" ↔ "Apple laptop, silver, damaged corner"
      
      Return ONLY valid JSON:
      {
        "similarity": 0.85,
        "reasoning": "Both describe the same [item type]. Key matching features: [list matches]. Minor differences: [list differences]."
      }
      
      Similarity score (0-1):
      - 0.9-1.0: Definitely the same item (exact match on key features)
      - 0.7-0.9: Very likely the same (matches on type + several characteristics)
      - 0.5-0.7: Possibly the same (matches type + some characteristics)
      - 0.3-0.5: Uncertain (same type but different details)
      - 0.0-0.3: Different items
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      const parsed = JSON.parse(text);
      return Math.max(0, Math.min(1, parsed.similarity || 0));
    } catch (parseError) {
      console.log("Failed to parse AI response, using fallback:", parseError);
      return calculateBasicTextSimilarity(original, claim);
    }
  } catch (error) {
    console.log("AI text analysis failed, using fallback:", error);
    return calculateBasicTextSimilarity(original, claim);
  }
}

async function analyzeImageSimilarity(imagePath1: string, imagePath2: string): Promise<number> {
  if (!genAI) {
    console.log("No Gemini API key provided, using fallback image similarity");
    return 0.5; // Default moderate similarity
  }

  if (!fs.existsSync(imagePath1) || !fs.existsSync(imagePath2)) {
    return 0;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
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
          mimeType: getImageMimeType(imagePath1),
        },
      },
      {
        inlineData: {
          data: image2.toString("base64"),
          mimeType: getImageMimeType(imagePath2),
        },
      },
    ]);
    
    const response = result.response;
    const text = response.text();
    
    try {
      const parsed = JSON.parse(text);
      return Math.max(0, Math.min(1, parsed.similarity || 0));
    } catch (parseError) {
      console.log("Failed to parse AI image response:", parseError);
      return 0.5;
    }
  } catch (error) {
    console.log("AI image analysis failed:", error);
    return 0.5; // Default moderate similarity if AI fails
  }
}

function getImageMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

function calculateBasicTextSimilarity(text1: string, text2: string): number {
  // Normalize texts
  const normalize = (text: string) => text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const normalized1 = normalize(text1);
  const normalized2 = normalize(text2);
  
  // Extract words (filter out common words)
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'my', 'i', 'it', 'this', 'that']);
  
  const getKeywords = (text: string) => {
    return text.split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word));
  };
  
  const words1 = getKeywords(normalized1);
  const words2 = getKeywords(normalized2);
  
  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }
  
  // Calculate Jaccard similarity on keywords
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
  const union = new Set([...Array.from(set1), ...Array.from(set2)]);
  
  const jaccardScore = union.size > 0 ? intersection.size / union.size : 0;
  
  // Calculate fuzzy matching for partial word matches
  let fuzzyMatches = 0;
  const array1 = Array.from(set1);
  const array2 = Array.from(set2);
  
  for (const word1 of array1) {
    for (const word2 of array2) {
      if (word1.includes(word2) || word2.includes(word1)) {
        fuzzyMatches++;
        break;
      }
    }
  }
  const fuzzyScore = Math.max(set1.size, set2.size) > 0 ? fuzzyMatches / Math.max(set1.size, set2.size) : 0;
  
  // Calculate bigram similarity for phrase matching
  const getBigrams = (words: string[]) => {
    const bigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }
    return bigrams;
  };
  
  const bigrams1 = new Set(getBigrams(words1));
  const bigrams2 = new Set(getBigrams(words2));
  const bigramIntersection = new Set(Array.from(bigrams1).filter(x => bigrams2.has(x)));
  const bigramUnion = new Set([...Array.from(bigrams1), ...Array.from(bigrams2)]);
  const bigramScore = bigramUnion.size > 0 ? bigramIntersection.size / bigramUnion.size : 0;
  
  // Weighted combination: prioritize exact matches, then fuzzy, then phrases
  const finalScore = (0.5 * jaccardScore) + (0.3 * fuzzyScore) + (0.2 * bigramScore);
  
  return Math.min(1, finalScore);
}

export async function detectFraud(userId: string, failedClaims: number): Promise<{ isSuspicious: boolean; reason?: string }> {
  if (failedClaims >= 3) {
    if (!genAI) {
      return {
        isSuspicious: true,
        reason: "Multiple failed claim attempts detected"
      };
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        A user has failed ${failedClaims} claim attempts. Assess fraud risk and return JSON:
        
        {
          "isSuspicious": true,
          "reason": "Multiple failed claims indicate potential fraudulent activity..."
        }
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      try {
        const parsed = JSON.parse(text);
        
        return {
          isSuspicious: parsed.isSuspicious || failedClaims >= 3,
          reason: parsed.reason || "Multiple failed claim attempts detected"
        };
      } catch (parseError) {
        console.log("Failed to parse AI fraud detection response:", parseError);
        return {
          isSuspicious: true,
          reason: "Multiple failed claim attempts detected"
        };
      }
    } catch (error) {
      console.log("AI fraud detection failed:", error);
      return {
        isSuspicious: true,
        reason: "Multiple failed claim attempts detected"
      };
    }
  }
  
  return { isSuspicious: false };
}
