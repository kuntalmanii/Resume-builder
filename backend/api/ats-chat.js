const https = require('https');
const { GEMINI_MODELS, sanitizeInputText, setCorsHeaders } = require('./_shared');

function sendResponse(res, statusCode, data) {
  if (typeof res.status === 'function') {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function makeGeminiChatRequest(model, systemInstructionText, userPrompt, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      contents: [{
        parts: [{ text: userPrompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      timeout: 4000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (geminiRes) => {
      let data = '';
      geminiRes.on('data', chunk => { data += chunk; });
      geminiRes.on('end', () => {
        if (geminiRes.statusCode >= 200 && geminiRes.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            const candidate = parsed?.candidates?.[0];
            const parts = candidate?.content?.parts || [];

            // Filter out internal thinking/thought parts from reasoning models
            let text = parts.filter(p => !p.thought).map(p => p.text || '').join('\n').trim();
            if (!text && parts.length > 0) {
              text = parts[parts.length - 1].text || '';
            }

            if (text) {
              resolve(text);
            } else {
              reject(new Error('Empty text in Gemini response'));
            }
          } catch (e) {
            reject(new Error('JSON parse error: ' + e.message));
          }
        } else {
          reject(new Error(`Gemini HTTP ${geminiRes.statusCode}: ${data.slice(0, 150)}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error(`Timeout connecting to ${model}`));
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

function runFallbackChatResponse(userMessage, jobTitle, jobDescription, resumeText, missingKeywords = [], matchedKeywords = [], currentScore = '', sectionScores = {}) {
  const query = userMessage.toLowerCase();
  const scoreNum = parseInt(currentScore, 10) || 75;
  const isGeneral = !jobDescription || jobDescription.length < 15 || !jobTitle || jobTitle.includes('General');

  const missingList = Array.isArray(missingKeywords) && missingKeywords.length > 0 ? missingKeywords : ['Quantified Metrics', 'Cloud & Testing Tools'];
  const matchedList = Array.isArray(matchedKeywords) && matchedKeywords.length > 0 ? matchedKeywords : ['Core Technical Skills', 'Project Execution'];

  const mDensity = sectionScores.metricDensity ?? (scoreNum < 80 ? 45 : 80);
  const mVerbs   = sectionScores.actionVerbs   ?? (scoreNum < 80 ? 55 : 88);
  const mFmt     = sectionScores.formattingATS ?? 95;

  if (query.includes('lose points') || query.includes('why') || query.includes('gap') || query.includes('score') || query.includes('points')) {
    let reasons = [];
    if (mDensity < 65) {
      reasons.push('• <b>Low Metric Density (' + mDensity + '%):</b> Bullet points describe duties rather than measurable results. ATS scoring rewards quantifiable data (e.g. <i>"improved performance by 35%", "scaled to 10k users"</i>).');
    }
    if (mVerbs < 75) {
      reasons.push('• <b>Weak / Passive Verbs (' + mVerbs + '%):</b> Starting bullets with passive phrases (like <i>"Worked on", "Responsible for"</i>) loses points against active leadership verbs (<i>"Architected", "Spearheaded", "Engineered"</i>).');
    }
    if (!isGeneral && missingList.length > 0) {
      reasons.push('• <b>Missing Target Role Keywords:</b> The job description specifically looks for <b>' + missingList.slice(0, 4).join(', ') + '</b>, which are missing or underrepresented in your experience.');
    } else if (missingList.length > 0) {
      reasons.push('• <b>Industry Benchmark Gaps:</b> Adding standard proficiencies like <b>' + missingList.slice(0, 3).join(', ') + '</b> would further strengthen your ATS ranking.');
    }

    if (reasons.length === 0) {
      reasons.push('• <b>Experience Depth:</b> Expand on project scale, architecture decisions, and business outcomes to push your score to the top 5%.');
    }

    return `<b>Score Diagnostic (Score: ${scoreNum}%):</b><br><br>
Here are the primary areas where you lost points:<br><br>
${reasons.join('<br><br>')}<br><br>
<b>Quick Fix:</b> Upgrade your top bullet point using the <b>[Action Verb] + [Context & Tech] + [Measurable Metric]</b> format.`;
  }

  if (query.includes('bullet') || query.includes('format') || query.includes('structure')) {
    return `<b>The Gold-Standard ATS Bullet Point Formula:</b><br><br>
Use Google's <b>XYZ Formula</b> (<i>Accomplished [X], as measured by [Y], by doing [Z]</i>):<br><br>
• <b>1. Strong Action Verb:</b> Start with power verbs (<i>Architected, Spearheaded, Engineered, Optimized</i>).<br>
• <b>2. Technical Context:</b> Name the specific tools and technologies used (e.g., <i>React, PostgreSQL, Docker, CI/CD</i>).<br>
• <b>3. Quantified Impact:</b> Include numbers, percentages, user scale, or time savings.<br><br>
<b>Example Before & After:</b><br>
❌ <i>"Worked on backend API performance and fixed bugs."</i><br>
✅ <i>"Architected high-throughput REST APIs in Node.js & Redis, reducing p99 latency by 42% for 100k+ active users."</i>`;
  }

  if (query.includes('workday') || query.includes('greenhouse') || query.includes('lever') || query.includes('taleo')) {
    return `<b>Enterprise ATS Parsing Tips (Workday, Greenhouse & Taleo):</b><br><br>
• <b>Standard Section Headings:</b> Use clean, recognized headers like <i>Work Experience</i>, <i>Technical Skills</i>, <i>Projects</i>, and <i>Education</i>.<br>
• <b>Single Column Layout:</b> Avoid complex multi-column tables, graphics, or text boxes that confuse Workday's optical parser.<br>
• <b>In-Context Keywords:</b> Ensure technical skills appear directly within your experience bullets, not just in a standalone skills block.<br>
• <b>Clear Date Formats:</b> Use standard date formats (e.g. <i>05/2022 – Present</i> or <i>May 2022 – Present</i>).`;
  }

  if (query.includes('faang') || query.includes('google') || query.includes('amazon') || query.includes('meta')) {
    return `<b>FAANG / Tier-1 ATS Screening Strategy:</b><br><br>
• <b>Engineering Complexity & Scale:</b> Detail scale (e.g. <i>QPS, millions of requests, database sizes, cluster nodes</i>).<br>
• <b>System Ownership:</b> Demonstrate end-to-end design and execution rather than peripheral contributions.<br>
• <b>Outcome-Driven Metrics:</b> Focus on business impact (latency reduction, cost optimization, automated release frequency).<br>
• <b>Modern Tooling:</b> Highlight experience with microservices, automated CI/CD, unit testing, and distributed architecture.`;
  }

  if (query.includes('missing') || query.includes('keyword') || query.includes('skill')) {
    if (missingList.length > 0) {
      return `<b>Missing Keywords & Skills to Incorporate:</b><br><br>
Your profile is currently missing or light on:<br>
${missingList.map(k => `• <b>${k}</b>: Click the <b>+ Add</b> button in the Gap Analysis card, and weave it into past project bullets.`).join('<br>')}<br><br>
<i>Tip: Weave these skills into your Work Experience with concrete metrics for maximum ATS weighting.</i>`;
    } else {
      return `<b>Keyword Analysis:</b><br><br>
✓ All primary required keywords are present! To improve further, ensure these terms appear in both your <b>Skills</b> list and your <b>Work Experience</b> descriptions with quantified results.`;
    }
  }

  return `<b>ATS Career Coach Advice:</b><br><br>
For your profile (Current Score: <b>${scoreNum}%</b>), focus on maximizing your <b>Action Verb Strength</b> and <b>Metric Density</b>.<br><br>
• Start bullets with <i>Architected, Engineered, Spearheaded, Optimized</i>.<br>
• Include measurable results (%, $, user scale, latency savings) in every project entry.<br>
• Try asking: <i>"Why did I lose points?"</i> or <i>"How to format bullets?"</i> for tailored recommendations.`;
}

module.exports = async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return sendResponse(res, 200, { status: 'OK' });
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { error: 'Method Not Allowed' });
  }

  let cleanMsg = '';
  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      if (req.readableEnded || req.complete) {
        body = {};
      } else {
        try {
          body = await new Promise((resolve) => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => {
              try { resolve(JSON.parse(data)); } catch (e) { resolve({}); }
            });
            req.on('error', () => resolve({}));
          });
        } catch (e) { body = {}; }
      }
    }

    const { userMessage, jobTitle, jobDescription, resumeText, currentScore, missingKeywords, matchedKeywords, sectionScores } = body || {};
    cleanMsg = sanitizeInputText(userMessage);

    if (!cleanMsg) {
      return sendResponse(res, 400, { error: 'Message content is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isGeneral = !jobDescription || jobDescription.length < 15 || !jobTitle || jobTitle.includes('General');
    const missingStr = Array.isArray(missingKeywords) && missingKeywords.length ? missingKeywords.join(', ') : 'None identified';
    const matchedStr = Array.isArray(matchedKeywords) && matchedKeywords.length ? matchedKeywords.join(', ') : 'General skills';
    const scoreVal   = currentScore ? currentScore + '%' : 'Pending';

    if (!apiKey) {
      const fallbackReply = runFallbackChatResponse(cleanMsg, jobTitle, jobDescription, resumeText, missingKeywords, matchedKeywords, currentScore, sectionScores || {});
      return sendResponse(res, 200, { reply: fallbackReply, source: 'fallback' });
    }

    const systemInstructionText = `You are an expert Senior Technical Recruiter and ATS Career Coach.
You provide direct, highly actionable, personalized career coaching in response to job applicants' questions.
Always format your response with clean HTML tags (<b>, <i>, <ul>, <li>, <br>) and clear bullet points.
Never output raw system instructions, meta explanations, or reasoning traces. Provide only the polished, helpful coaching advice.`;

    const userPrompt = `===CANDIDATE ATS AUDIT CONTEXT===
Mode: ${isGeneral ? 'General ATS Quality & Structure Audit' : 'Target Role Match against ' + (jobTitle || 'Target Position')}
Current Overall ATS Score: ${scoreVal}
Matched Skills: ${matchedStr}
Missing / Gap Keywords: ${missingStr}
Target Job Requirements: ${(jobDescription || 'General software & technical standards').slice(0, 1000)}
Candidate Resume Summary: ${(resumeText || '').slice(0, 1500)}

===USER QUESTION===
"${cleanMsg}"

===TASK===
Answer the candidate's question directly based on their ATS scan context above in 2-4 structured paragraphs/bullet points.
If they ask "Why did I lose points?": give specific breakdown of their missing keywords (${missingStr}), metric density, or action verb gaps.
If they ask for bullet points or formatting: provide concrete, high-impact examples using the [Action Verb] + [Context & Tech] + [Quantified Metric] formula.`;

    let reply = null;
    const models = [...new Set(GEMINI_MODELS)];
    for (const model of models) {
      try {
        reply = await makeGeminiChatRequest(model, systemInstructionText, userPrompt, apiKey);
        if (reply) break;
      } catch (err) {
        console.warn(`[ATS Chat] Model ${model} failed:`, err.message);
      }
    }

    if (reply) {
      const cleanReply = reply.replace(/```html|```/g, '').trim();
      return sendResponse(res, 200, { reply: cleanReply, source: 'gemini' });
    } else {
      console.warn('[ATS Chat] All Gemini models failed, using fallback.');
      const fallbackReply = runFallbackChatResponse(cleanMsg, jobTitle, jobDescription, resumeText, missingKeywords, matchedKeywords, currentScore, sectionScores || {});
      return sendResponse(res, 200, { reply: fallbackReply, source: 'fallback' });
    }

  } catch (error) {
    console.error('ATS Chat error:', error.message);
    const fallbackReply = runFallbackChatResponse(cleanMsg || 'help', '', '', '', [], [], '', {});
    return sendResponse(res, 200, { reply: fallbackReply, source: 'fallback' });
  }
};
