const https = require('https');
const { GEMINI_MODELS, sanitizeInputText, setCorsHeaders } = require('./_shared');

function sendResponse(res, statusCode, data) {
  if (typeof res.status === 'function') {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function callGeminiChat(apiKey, prompt, modelIndex = 0) {
  return new Promise((resolve, reject) => {
    if (modelIndex >= GEMINI_MODELS.length) {
      return reject(new Error('All Gemini AI models failed'));
    }

    const model = GEMINI_MODELS[modelIndex];
    const postData = JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600
      }
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
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            resolve(text);
          } else {
            console.warn(`Model ${model} returned empty response for ats-chat, trying next model...`);
            callGeminiChat(apiKey, prompt, modelIndex + 1).then(resolve).catch(reject);
          }
        } catch (e) {
          callGeminiChat(apiKey, prompt, modelIndex + 1).then(resolve).catch(reject);
        }
      });
    });

    req.on('error', (err) => {
      console.warn(`Model ${model} network error for ats-chat:`, err.message);
      callGeminiChat(apiKey, prompt, modelIndex + 1).then(resolve).catch(reject);
    });

    req.write(postData);
    req.end();
  });
}

function runFallbackChatResponse(userMessage, jobTitle, jobDescription, resumeText) {
  const query = userMessage.toLowerCase();

  if (query.includes('lose points') || query.includes('why') || query.includes('gap') || query.includes('score')) {
    return `<b>ATS Score Analysis Breakdown:</b><br>
    Points are typically deducted due to:
    <br>1. <b>Missing Core Skills</b>: Key terms present in the target job description that are absent from your resume.
    <br>2. <b>Lack of Quantified Impact</b>: Bullet points without metrics (e.g. %, $, numbers, or scale).
    <br>3. <b>Un-anchored Keywords</b>: Listing technical skills in a skills block without demonstrating their application in your work experience.`;
  }

  if (query.includes('workday') || query.includes('greenhouse') || query.includes('lever') || query.includes('taleo')) {
    return `<b>ATS Parser Optimization Tips:</b><br>
    • <b>Workday & Taleo</b>: Rely on exact literal text matching. Ensure skill keywords match the target Job Description word-for-word.
    • <b>Greenhouse & Lever</b>: Parse structured experience sections. Use standard headings (e.g. <i>Work Experience</i>, <i>Technical Skills</i>, <i>Education</i>).
    • Avoid complex multi-column tables, text boxes, or embedded images that confuse parser trees.`;
  }

  if (query.includes('add') || query.includes('how to') || query.includes('bullet')) {
    const topic = userMessage.replace(/how to add|how do i add|add|to my resume/gi, '').trim() || 'Required Skill';
    return `<b>Recommended Bullet Point for "${topic}":</b><br>
    <i>"Spearheaded enterprise implementation of <b>${topic}</b> across core application modules, optimizing workflow performance and achieving 99.9% system reliability."</i>`;
  }

  return `<b>ATS Career Coach Advice:</b><br>
  For the target role <b>${jobTitle || 'Target Position'}</b>, focus on incorporating exact skill keywords from the job description into high-impact bullet points: <b>[Strong Action Verb] + [Context & Tech Stack] + [Quantified Metric]</b>.`;
}

module.exports = async (req, res) => {
  setCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return sendResponse(res, 200, { status: 'OK' });
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      try {
        body = await new Promise((resolve) => {
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { resolve({}); }
          });
        });
      } catch (e) { body = {}; }
    }

    const { userMessage, jobTitle, jobDescription, resumeText, currentScore } = body || {};
    const cleanMsg = sanitizeInputText(userMessage);

    if (!cleanMsg) {
      return sendResponse(res, 400, { error: 'Message content is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      const fallbackReply = runFallbackChatResponse(cleanMsg, jobTitle, jobDescription, resumeText);
      return sendResponse(res, 200, { reply: fallbackReply, source: 'fallback' });
    }

    const prompt = `You are an expert ATS (Applicant Tracking System) Career Coach and Executive Resume Auditor.
Analyze the user's career question in the context of their target role and resume:

Target Job Title: "${jobTitle || 'Not specified'}"
Current ATS Score: "${currentScore ? currentScore + '%' : 'Pending'}"
Job Description context: "${(jobDescription || '').slice(0, 1000)}"
Candidate Resume context: "${(resumeText || '').slice(0, 1000)}"

User Question: "${cleanMsg}"

Instructions:
- Provide a direct, highly practical, and actionable answer (2-4 concise paragraphs max).
- Format your response using clean HTML tags (e.g. <b>, <i>, <br>, <ul>, <li>) so it renders beautifully in a chat box.
- Give concrete bullet point examples or keyword positioning tips where relevant.`;

    try {
      const geminiReply = await callGeminiChat(apiKey, prompt);
      const cleanReply = geminiReply.replace(/```html|```/g, '').trim();
      return sendResponse(res, 200, { reply: cleanReply, source: 'gemini' });
    } catch (aiErr) {
      console.warn('Gemini chat API call failed, using fallback:', aiErr.message);
      const fallbackReply = runFallbackChatResponse(cleanMsg, jobTitle, jobDescription, resumeText);
      return sendResponse(res, 200, { reply: fallbackReply, source: 'fallback' });
    }

  } catch (error) {
    console.error('ATS Chat error:', error.message);
    return sendResponse(res, 500, { error: 'Failed to process chat request' });
  }
};
