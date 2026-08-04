const https = require('https');

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-8b'];

const SHARED_TAXONOMY_KEYWORDS = [
  'TypeScript', 'React', 'Next.js', 'JavaScript', 'HTML', 'CSS', 'Vanilla CSS',
  'Node.js', 'Express', 'Python', 'Django', 'FastAPI', 'Go', 'Rust', 'Java',
  'Spring Boot', 'C++', 'GraphQL', 'REST API', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Redis', 'Supabase', 'Firebase', 'AWS', 'Docker', 'Kubernetes', 'CI/CD',
  'Git', 'Jest', 'TailwindCSS', 'Microservices', 'System Design',
  'Machine Learning', 'PyTorch', 'TensorFlow', 'NLP', 'Data Science', 'Pandas',
  'NumPy', 'Scikit-Learn', 'Deep Learning', 'Photoshop', 'Illustrator', 'Figma',
  'Graphic Design', 'UI/UX Design', 'InDesign', 'Typography', 'Vector Graphics',
  'Agile', 'Scrum', 'Jira', 'Budget Management', 'Project Management', 'Sprint Planning',
  'Risk Mitigation', 'Resource Allocation', 'Communication', 'Problem-Solving', 'Problem Solving',
  'Conflict Resolution', 'Client Retention', 'Customer Success', 'Customer Satisfaction',
  'Stakeholder Engagement', 'Presentation', 'Relationship Management', 'Cross-Functional Leadership'
];

function sanitizeInputText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

function extractKeywords(text) {
  if (!text) return new Set();
  const lower = text.toLowerCase();
  const found = new Set();
  SHARED_TAXONOMY_KEYWORDS.forEach(kw => {
    if (lower.includes(kw.toLowerCase())) {
      found.add(kw);
    }
  });
  return found;
}

function runServerFallbackAnalysis(resumeText, jobDescription) {
  const cleanResume = sanitizeInputText(resumeText);
  const cleanJd = sanitizeInputText(jobDescription);

  const resumeKeywords = extractKeywords(cleanResume);
  const jdKeywords = extractKeywords(cleanJd);

  // Fallback word extraction if taxonomy items are sparse in JD
  if (jdKeywords.size === 0 && cleanJd.length > 20) {
    const words = cleanJd.match(/\b[A-Za-z]{4,}\b/g) || [];
    const stopWords = new Set(['and','the','with','for','you','are','our','will','have','this','that','from','your','requirements','experience','seeking','senior','lead','developer','engineer','ability','work','team']);
    const wordFreq = {};
    words.forEach(w => {
      if (!stopWords.has(w.toLowerCase())) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });
    const topWords = Object.keys(wordFreq).sort((a,b) => wordFreq[b] - wordFreq[a]).slice(0, 8);
    topWords.forEach(w => jdKeywords.add(w));
  }

  const matched = [];
  const missing = [];

  jdKeywords.forEach(kw => {
    if (resumeKeywords.has(kw) || cleanResume.toLowerCase().includes(kw.toLowerCase())) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  });

  const matchedCount = matched.length;
  const totalCount = jdKeywords.size || 1;
  const matchPct = Math.min(100, Math.round((matchedCount / totalCount) * 100));

  // Contextual Integrity & Keyword Stuffing Detector
  const resumeWords = cleanResume.match(/\b[A-Za-z]{3,}\b/g) || [];
  const totalWords = resumeWords.length;
  const uniqueWords = new Set(resumeWords.map(w => w.toLowerCase())).size;
  const lexicalDiversity = totalWords > 0 ? (uniqueWords / totalWords) : 1;

  const hasActionVerbs = /(managed|led|directed|architected|engineered|built|building|scaled|delivered|budgeted|optimized|spearheaded|implemented|developed|developing|designed|designing)\b/i.test(cleanResume);
  const hasWorkDates = /\b(20\d\d|19\d\d|present|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|years|yrs)\b/i.test(cleanResume);

  const isKeywordStuffed = (totalWords > 15 && lexicalDiversity < 0.35) || (totalWords > 10 && !hasActionVerbs && !hasWorkDates);

  let finalScore = matchPct;
  let formattingScore = 95;
  let experienceScore = 88;
  const recommendations = [];

  if (isKeywordStuffed) {
    // Cap score and penalize experience/formatting due to lack of contextual experience
    finalScore = Math.min(20, Math.round(matchPct * 0.20));
    formattingScore = 30;
    experienceScore = 15;
    recommendations.push('⚠️ Keyword Stuffing Warning: Your resume contains repeated keywords without contextual work experience, action verbs, or quantifiable metrics. Modern ATS parsers penalize un-anchored keyword lists.');
    recommendations.push('Rewrite experience items using structured bullet points: [Action Verb] + [Context/Project] + [Quantified Metric].');
  } else if (missing.length > 0) {
    recommendations.push(`Critical Skill Gap: The uploaded resume lacks required core technical competencies for this role (missing: ${missing.slice(0, 4).join(', ')}).`);
    recommendations.push('Incorporate target technical keywords directly into your experience section headings for ATS compliance.');
  } else {
    recommendations.push('Excellent alignment! Your resume matches all core technical requirements.');
    recommendations.push('Quantify experience bullets using metric-driven outcome formulas ([Action Verb] + [Metric] + [Outcome]).');
  }
  const verdict = finalScore >= 85 ? 'SHORTLIST' : (finalScore >= 70 ? 'HOLD' : 'REJECT');

  return {
    score: finalScore,
    verdict,
    matchedKeywords: matched,
    missingKeywords: missing,
    recommendations,
    sectionScores: {
      keywordMatch: finalScore,
      skillsAlignment: Math.min(100, Math.round(finalScore * 0.95)),
      formattingATS: formattingScore,
      experienceImpact: experienceScore
    }
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
              const rawScore = analysisObj.score ?? analysisObj.match_score ?? 75;
              const missingMustHave = analysisObj.missing_must_have_skills || [];
              const missingNiceToHave = analysisObj.missing_nice_to_have_skills || [];
              const allMissing = analysisObj.missingKeywords || [...missingMustHave, ...missingNiceToHave];

              const recommendations = analysisObj.actionable_fixes || analysisObj.recommendations ||
                (analysisObj.gaps_and_recommendations ? analysisObj.gaps_and_recommendations.map(g => typeof g === 'object' ? `${g.issue}: ${g.actionable_fix}` : String(g)) : []);

              const normalized = {
                score: rawScore,
                verdict: analysisObj.verdict || (rawScore >= 85 ? 'SHORTLIST' : (rawScore >= 70 ? 'HOLD' : 'REJECT')),
                matchedKeywords: analysisObj.matchedKeywords || analysisObj.matching_keywords || [],
                missingKeywords: allMissing,
                recommendations: recommendations,
                deductionsBreakdown: analysisObj.deductions_breakdown || [],
                criticalGapsSummary: analysisObj.critical_gaps_summary || '',
                sectionScores: analysisObj.sectionScores || {
                  keywordMatch: rawScore,
                  skillsAlignment: Math.min(100, Math.round(rawScore * 0.95)),
                  formattingATS: analysisObj.quantified_metrics_present === false ? 60 : 95,
                  experienceImpact: rawScore < 50 ? 35 : 88
                }
              };
              resolve(normalized);
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
    const resumeText = body.resumeText || body.resume_text || '';
    const jobDescription = body.jobDescription || body.jdText || body.targetJdText || body.job_description || '';
    const preferredModel = body.preferredModel || body.geminiModel || '';
    const cleanResume = sanitizeInputText(resumeText);
    const cleanJd = sanitizeInputText(jobDescription);

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback = runServerFallbackAnalysis(cleanResume, cleanJd);
      return res.status(200).json(fallback);
    }

    const prompt = `You are an expert Senior Technical Recruiter and Applicant Tracking System (ATS) Parser.
Analyze the following Candidate Resume against the Target Job Description for ATS compatibility.

JOB DESCRIPTION:
${cleanJd}

CANDIDATE RESUME & SKILLS TEXT:
${cleanResume}

Evaluate keyword overlap, hard technical requirements, and section formatting.
Respond STRICTLY with a valid JSON object following this exact JSON schema:
{
  "score": <number between 0 and 100 representing ATS match percentage>,
  "matchedKeywords": [<array of technical skills, frameworks, and requirements matched in both>],
  "missingKeywords": [<array of critical technical skills & qualifications present in JD but missing in Resume>],
  "recommendations": [<array of formatting or ATS parsing recommendations>],
  "sectionScores": {
    "keywordMatch": <0-100>,
    "skillsAlignment": <0-100>,
    "formattingATS": <0-100>,
    "experienceImpact": <0-100>
  }
}`;

    let result = null;
    let modelsToTry = [preferredModel, ...GEMINI_MODELS].filter(Boolean);
    modelsToTry = [...new Set(modelsToTry)];

    for (const model of modelsToTry) {
      try {
        result = await makeGeminiRequest(model, prompt, apiKey);
        if (result) break;
      } catch (err) {
        console.warn(`Model ${model} failed, trying next...`, err.message);
      }
    }

    if (!result) {
      result = runServerFallbackAnalysis(cleanResume, cleanJd);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('ATS API catch error:', err);
    const body = req.body || {};
    const fallback = runServerFallbackAnalysis(body.resumeText || '', body.jobDescription || '');
    return res.status(200).json(fallback);
  }
};
