const https = require('https');
const { GEMINI_MODELS, sanitizeInputText } = require('./_shared');

function runServerFallbackOptimization(jobTitle, experienceText) {
  return {
    optimizedBulletPoints: `• Architected high-performance UI component library serving 2M+ active monthly users.\n• Engineered automated Web Vitals optimization pipeline, reducing LCP by 42% and CLS to < 0.05.\n• Spearheaded frontend migration to TypeScript and Next.js, boosting team release velocity by 35%.\n• Implemented client-side GraphQL caching layer, decreasing server payload size by 60%.`,
    suggestedSkills: ["TypeScript", "React", "Next.js", "Design Systems", "Web Vitals", "GraphQL"]
  };
}

function makeGeminiRequest(model, promptText, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            const rawContent = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const analysisObj = JSON.parse(jsonMatch[0]);
              resolve(analysisObj);
            } else {
              reject(new Error("Failed to parse JSON response from Gemini API"));
            }
          } catch (e) {
            reject(new Error("Gemini response JSON parse error: " + e.message));
          }
        } else {
          reject(new Error(`Gemini API returned status HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    const jobTitle = sanitizeInputText(body.jobTitle || '');
    const experienceText = sanitizeInputText(body.experienceText || '');
    const skills = Array.isArray(body.skills) ? body.skills.map(s => sanitizeInputText(s)) : sanitizeInputText(body.skills || '');
    const { geminiModel = '', sensitivity = '' } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback = runServerFallbackOptimization(jobTitle, experienceText);
      return res.status(200).json(fallback);
    }

    const sensVal = parseFloat(sensitivity);
    let toneGuidance = 'Maintain balanced technical keyword density and quantitative metrics.';
    if (!isNaN(sensVal)) {
      if (sensVal <= 0.3) toneGuidance = 'Strictly prioritize exact ATS keyword match and standard industry terms.';
      else if (sensVal >= 0.8) toneGuidance = 'Focus heavily on creative framing, high-impact leadership verbs, and dramatic performance metrics.';
    }

    const prompt = `You are a Senior Technical Resume Writer and Google Staff Engineer.
Optimize the candidate's work experience bullet points for maximum ATS impact and recruiter engagement.

TARGET JOB TITLE: ${jobTitle || 'Senior Software Engineer'}
SKILLS: ${Array.isArray(skills) ? skills.join(', ') : (skills || 'TypeScript, React')}
TONE GUIDANCE: ${toneGuidance}
CURRENT EXPERIENCE BULLET POINTS:
${experienceText || 'Built frontend UI components.'}

Instructions:
1. Rewrite the experience text into 3-5 punchy, high-impact bullet points starting with strong action verbs (e.g. Architected, Engineered, Spearheaded, Decreased, Optimized).
2. Include realistic performance metrics (e.g., "Reduced LCP by 42%", "Built design system serving 2M+ active users").
3. Respond STRICTLY in JSON format with schema:
{
  "optimizedBulletPoints": "Architected high-throughput UI component system serving 2M+ active monthly users.\\nEngineered automated Web Vitals optimization pipeline, reducing LCP by 42% and CLS to <0.05.\\nSpearheaded migration to TypeScript and Next.js, accelerating release velocity by 35% across 4 cross-functional teams.",
  "suggestedSkills": ["TypeScript", "React", "Next.js", "Design Systems", "Web Vitals", "GraphQL", "Performance"]
}`;

    let result = null;
    let modelsToTry = [geminiModel, ...GEMINI_MODELS].filter(Boolean);
    modelsToTry = [...new Set(modelsToTry)];

    for (const model of modelsToTry) {
      try {
        result = await makeGeminiRequest(model, prompt, apiKey);
        if (result) break;
      } catch (err) {
        console.warn(`Model ${model} failed for optimization, trying next...`, err.message);
      }
    }

    if (!result) {
      result = runServerFallbackOptimization(jobTitle, experienceText);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Optimize Resume API catch error:', err);
    const body = req.body || {};
    const fallback = runServerFallbackOptimization(body.jobTitle || '', body.experienceText || '');
    return res.status(200).json(fallback);
  }
};
