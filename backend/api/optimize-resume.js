const https = require('https');
const { GEMINI_MODELS, sanitizeInputText, setCorsHeaders } = require('./_shared');

function runServerFallbackOptimization(jobTitle, text, section, action) {
  let cleanText = (text || '').trim();

  // Extract companies mentioned in input
  const companies = [];
  if (/google/i.test(cleanText)) companies.push('Google');
  if (/amazon/i.test(cleanText)) companies.push('Amazon');
  if (/microsoft/i.test(cleanText)) companies.push('Microsoft');
  if (/apple/i.test(cleanText)) companies.push('Apple');
  if (/meta|facebook/i.test(cleanText)) companies.push('Meta');
  if (/netflix/i.test(cleanText)) companies.push('Netflix');
  if (/stripe/i.test(cleanText)) companies.push('Stripe');

  let companyContext = companies.length > 0
    ? `at leading technology companies including ${companies.join(' and ')}`
    : 'in high-growth technology environments';

  let shortCompanyContext = companies.length > 0
    ? `at ${companies.join(' and ')}`
    : 'at top technology firms';

  const roleTitle = jobTitle || 'Software Engineer';

  if (!section || section === 'summary') {
    let summaryParagraph = `Results-driven ${roleTitle} with proven experience ${companyContext}. Demonstrated track record architecting high-availability systems, optimizing performance, and collaborating across engineering teams to ship scalable products.`;

    if (/shorten/i.test(action)) {
      summaryParagraph = `${roleTitle} ${shortCompanyContext} with expertise in building high-performance web applications and scalable cloud services.`;
    } else if (/executive/i.test(action)) {
      summaryParagraph = `Strategic ${roleTitle} ${companyContext}. Demonstrated expertise driving technical architecture decisions, scaling cloud infrastructure, and leading high-performing engineering teams.`;
    } else if (/technical/i.test(action)) {
      summaryParagraph = `Senior ${roleTitle} ${companyContext}. Specialized in distributed cloud architecture, high-throughput microservices, TypeScript/React systems, and CI/CD pipelines.`;
    } else if (/ats/i.test(action)) {
      summaryParagraph = `Results-oriented ${roleTitle} ${shortCompanyContext}. Skilled in full-stack web development, system architecture, database optimization, and agile software delivery.`;
    }

    return {
      section: 'summary',
      optimizedText: summaryParagraph,
      optimizedBulletPoints: summaryParagraph,
      suggestedSkills: ['TypeScript', 'React', 'Node.js', 'System Design', 'Cloud Architecture']
    };
  }

  // Work Experience fallback
  let bullets = `• Architected scalable web services ${shortCompanyContext}, maintaining 99.99% uptime for high-volume user traffic.\n• Optimized application performance and database queries, cutting average p99 response latency significantly.\n• Spearheaded technical initiatives across cross-functional engineering teams, boosting deployment velocity.`;

  return {
    section: 'experience',
    optimizedText: bullets,
    optimizedBulletPoints: bullets,
    suggestedSkills: ["TypeScript", "React", "Next.js", "System Design", "Cloud Architecture", "GraphQL"]
  };
}

function makeGeminiRequest(model, promptText, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
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
          reject(new Error(`Gemini API returned status HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(postData);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    const jobTitle = sanitizeInputText(body.jobTitle || '');
    const section = sanitizeInputText(body.section || 'summary');
    const action = sanitizeInputText(body.action || body.prompt || 'Improve Writing');
    const text = sanitizeInputText(body.text || body.experienceText || body.resumeText || '');
    const skills = Array.isArray(body.skills) ? body.skills.map(s => sanitizeInputText(s)) : sanitizeInputText(body.skills || '');
    const { geminiModel = '' } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback = runServerFallbackOptimization(jobTitle, text, section, action);
      return res.status(200).json(fallback);
    }

    const prompt = `You are an expert Senior Technical Resume Writer and Hiring Manager.
Rewrite and optimize the candidate's ${section.toUpperCase()} section based STRICTLY on their input background.

TARGET JOB TITLE: ${jobTitle || 'Software Engineer'}
SKILLS: ${Array.isArray(skills) ? skills.join(', ') : (skills || 'TypeScript, React')}
ACTION REQUEST: ${action}
RAW CANDIDATE INPUT:
"${text || 'worked at Google and Amazon'}"

CRITICAL INSTRUCTIONS:
1. Preserve the candidate's actual work experience and company names (e.g. Google, Amazon, Microsoft). Do NOT invent unrelated skills or companies.
2. If section is "summary", generate a cohesive 2-3 sentence professional summary paragraph. Do NOT use bullet points for summary.
3. If section is "experience", generate 3-4 high-impact experience bullet points with action verbs and metrics.
4. Respond STRICTLY in JSON format with schema:
{
  "section": "${section}",
  "optimizedText": "<rewritten high-impact text or summary paragraph>",
  "optimizedBulletPoints": "<rewritten text or bullets>",
  "suggestedSkills": ["<skill1>", "<skill2>", "<skill3>"]
}`;

    let result = null;
    let modelsToTry = [geminiModel, ...GEMINI_MODELS].filter(Boolean);
    modelsToTry = [...new Set(modelsToTry)];

    for (const model of modelsToTry) {
      try {
        result = await makeGeminiRequest(model, prompt, apiKey);
        if (result && (result.optimizedText || result.optimizedBulletPoints)) break;
      } catch (err) {
        console.warn(`Model ${model} failed for optimization:`, err.message);
      }
    }

    if (!result || (!result.optimizedText && !result.optimizedBulletPoints)) {
      result = runServerFallbackOptimization(jobTitle, text, section, action);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('Optimize Resume API catch error:', err);
    const body = req.body || {};
    const fallback = runServerFallbackOptimization(body.jobTitle || '', body.text || '', body.section || '', body.action || '');
    return res.status(200).json(fallback);
  }
};
