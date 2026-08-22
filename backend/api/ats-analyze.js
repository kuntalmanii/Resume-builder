const https = require('https');
const { GEMINI_MODELS, SHARED_TAXONOMY_KEYWORDS, sanitizeInputText, setCorsHeaders } = require('./_shared');

function extractKeywords(text) {
  if (!text) return new Set();
  const lower = text.toLowerCase();
  const found = new Set();
  SHARED_TAXONOMY_KEYWORDS.forEach(kw => { if (lower.includes(kw.toLowerCase())) found.add(kw); });
  return found;
}

function runServerFallbackAnalysis(resumeText, jobDescription) {
  const cleanResume = sanitizeInputText(resumeText);
  const cleanJd     = sanitizeInputText(jobDescription);
  const resumeKws   = extractKeywords(cleanResume);
  const isGeneralAudit = !cleanJd || cleanJd.length < 15;

  const words    = cleanResume.match(/\b[A-Za-z]{3,}\b/g) || [];
  const total    = words.length;
  const unique   = new Set(words.map(w => w.toLowerCase())).size;
  const lexDiv   = total > 0 ? unique / total : 1;
  const hasVerbs = /(managed|led|directed|architected|engineered|built|scaled|delivered|optimized|spearheaded|implemented|developed|designed|formulated|executed)\b/i.test(cleanResume);
  const hasDates = /\b(20\d\d|19\d\d|present|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(cleanResume);
  const hasNums  = /\d+[%x+]|\$\d+|\d+\s*(million|billion|users?|teams?|latency|uptime|projects?|k)\b/i.test(cleanResume);
  const hasContact = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}|\+?\d[\d\s\-().]{7,}\d|linkedin\.com|github\.com)/i.test(cleanResume);
  const stuffed  = (total > 15 && lexDiv < 0.35) || (total > 10 && !hasVerbs && !hasDates);

  let finalScore = 75;
  let matched = [];
  let missing = [];
  const recs = [];

  if (isGeneralAudit) {
    // ── GENERAL ATS RESUME HEALTH AUDIT MODE ──
    matched = Array.from(resumeKws);
    if (matched.length === 0) {
      matched = ['Problem-Solving', 'Communication', 'Project Management'];
    }

    // Identify high-impact recommended additions if not already in resume
    const recommendedStandardSkills = ['CI/CD', 'Git', 'REST API', 'Docker', 'Agile', 'Unit Testing', 'System Design'];
    missing = recommendedStandardSkills.filter(sk => !resumeKws.has(sk) && !cleanResume.toLowerCase().includes(sk.toLowerCase())).slice(0, 4);

    const fmtScore   = stuffed ? 35 : (hasContact ? 96 : 84);
    const verbScore  = stuffed ? 25 : (hasVerbs ? 90 : 54);
    const numScore   = stuffed ? 20 : (hasNums ? 88 : 48);
    const readScore  = Math.min(98, Math.max(65, 72 + Math.round(lexDiv * 35)));
    const skillScore = Math.min(98, Math.max(60, 65 + Math.min(30, matched.length * 4)));
    const expScore   = Math.round((verbScore * 0.5) + (numScore * 0.5));

    finalScore = stuffed ? 22 : Math.round((fmtScore * 0.25) + (expScore * 0.3) + (skillScore * 0.25) + (readScore * 0.2));

    if (stuffed) {
      recs.push('Keyword Stuffing Warning: Resume appears to be a raw keyword list without structured experience, dates, or action verbs. ATS parsers penalize this format severely.');
      recs.push('Restructure into standard reverse-chronological sections: Experience, Projects, Skills, and Education.');
    } else {
      recs.push(`General ATS Readiness: Detected ${matched.length} core technical & professional competencies.`);
      if (!hasNums) {
        recs.push('Quantify Business Impact: Add measurable metrics (e.g. "% improvement", "p99 latency", "$ revenue saved", "user scale") to your work experience bullets.');
      } else {
        recs.push('Strong Metric Density: Quantified metrics detected across experience entries.');
      }
      if (!hasVerbs) {
        recs.push('Strengthen Action Verbs: Begin each bullet with proactive leadership verbs (e.g. Architected, Engineered, Spearheaded, Optimized).');
      } else {
        recs.push('Proactive Action Verbs: Strong action verbs detected throughout experience descriptions.');
      }
      if (missing.length > 0) {
        recs.push(`Industry Benchmark: Consider incorporating industry-standard proficiencies (${missing.join(', ')}) where applicable.`);
      }
    }
  } else {
    // ── TARGETED JOB MATCH MODE ──
    const jdKws = extractKeywords(cleanJd);
    if (jdKws.size === 0 && cleanJd.length > 20) {
      const words = cleanJd.match(/\b[A-Za-z]{4,}\b/g) || [];
      const stops = new Set(['and','the','with','for','you','are','our','will','have','this','that','from','your',
        'requirements','experience','seeking','senior','lead','developer','engineer','ability','work','team',
        'using','their','about','which','where','other','must','also','such','both','some','more','well']);
      const freq = {};
      words.forEach(w => { if (!stops.has(w.toLowerCase())) freq[w] = (freq[w]||0)+1; });
      Object.keys(freq).sort((a,b)=>freq[b]-freq[a]).slice(0,12).forEach(w=>jdKws.add(w));
    }

    jdKws.forEach(kw => {
      (resumeKws.has(kw) || cleanResume.toLowerCase().includes(kw.toLowerCase())) ? matched.push(kw) : missing.push(kw);
    });

    const pct = jdKws.size > 0 ? Math.min(100, Math.round((matched.length / jdKws.size) * 100)) : 70;
    finalScore = stuffed ? Math.min(20, Math.round(pct * 0.2)) : pct;

    if (stuffed) {
      recs.push('Keyword Stuffing Detected: Resume appears to be a keyword list without structured experience, dates, or action verbs. ATS parsers penalize this pattern severely.');
      recs.push('Rewrite each bullet using: [Action Verb] + [Project/Technology Context] + [Quantified Business Impact].');
    } else {
      if (missing.length > 0) recs.push(`Critical Skill Gap: Missing ${missing.length} required keywords (${missing.slice(0,4).join(', ')}). Incorporate these into your experience bullets.`);
      if (!hasNums)  recs.push('Metric Density Low: Add quantified achievements (%, $, user counts, team size, performance gains) to boost ATS experience scoring.');
      if (!hasVerbs) recs.push('Strengthen action verbs: Start every bullet with a powerful verb (Architected, Optimized, Engineered) instead of passive language.');
      if (matched.length > 0) recs.push(`Strong alignment on: ${matched.slice(0,5).join(', ')}. Ensure these appear in role-specific context, not only in a skills section.`);
    }
  }

  const verdict = stuffed
    ? 'This resume would not pass basic ATS parsing — it reads as a keyword dump without structured work experience or dates. Reject at screening stage.'
    : isGeneralAudit
    ? (finalScore >= 80
      ? `Strong ATS baseline (${finalScore}%). Clean structural parsing, strong skill density, and solid presentation. Adding more quantified metrics will push it into the top 5%.`
      : `Moderate ATS baseline (${finalScore}%). The resume has solid core content but needs stronger quantified metrics and proactive action verbs to pass strict ATS filters.`)
    : (finalScore >= 85
      ? 'Strong candidate. Clear technical depth and keyword alignment. Would pass ATS screening and warrant a phone screen. Adding impact metrics would make this top 5%.'
      : finalScore >= 65
      ? `Moderate fit. Missing ${missing.length > 0 ? missing.slice(0, 3).join(', ') : 'some key skills'}. With targeted additions in experience sections this could clear ATS filters.`
      : `Significant keyword gaps (${missing.slice(0, 3).join(', ')}). Target role requires specialized competencies not yet emphasized in your resume.`);

  // Extract actual candidate bullets from resume text for dynamic Smart Rewrites
  const rawBullets = cleanResume
    .split(/\n+/)
    .map(line => line.replace(/^[•\-\*\d\.\s]+/, '').trim())
    .filter(line => line.length > 20 && !/^(experience|education|skills|projects|summary|contact|certifications|phone|email|linkedin|github)/i.test(line));

  const generatedRewrites = [];
  if (rawBullets.length > 0) {
    const topBullet = rawBullets[0];
    const targetKw = missing[0] || matched[0] || (isGeneralAudit ? 'Scalable Architecture' : 'Technical Architecture');
    generatedRewrites.push({
      before: topBullet,
      after: `Architected high-performance system architecture incorporating ${targetKw}, improving application throughput by 38% and reducing p99 latency.`,
      highlights: [`Verb: Architected`, `Metric: +38% Throughput`, `Keywords: ${targetKw}`]
    });

    if (rawBullets.length > 1) {
      const secondBullet = rawBullets[1];
      const targetKw2 = missing[1] || matched[1] || (isGeneralAudit ? 'Automated CI/CD' : 'CI/CD Pipelines');
      generatedRewrites.push({
        before: secondBullet,
        after: `Spearheaded automated delivery pipelines integrating ${targetKw2}, cutting deployment release latency by 45% with zero downtime.`,
        highlights: [`Verb: Spearheaded`, `Metric: -45% Latency`, `Keywords: ${targetKw2}`]
      });
    }
  }

  const fmt = stuffed ? 30 : (hasContact ? 96 : 88);
  const exp = stuffed ? 15 : (hasNums ? 88 : 62);
  const metric = stuffed ? 10 : (hasNums ? 78 : 42);

  return {
    score: finalScore,
    isGeneralAudit,
    verdict: finalScore >= 85 ? 'SHORTLIST' : finalScore >= 70 ? 'HOLD' : 'REJECT',
    matchedKeywords: matched,
    missingKeywords: missing,
    recommendations: recs,
    recruiterVerdict: verdict,
    hiringProbability: {
      interview:  finalScore >= 85 ? '91%' : finalScore >= 70 ? '74%' : '48%',
      offer:      finalScore >= 85 ? '82%' : finalScore >= 70 ? '61%' : '33%',
      atsGatePass:finalScore >= 85 ? '97%' : finalScore >= 70 ? '81%' : '52%'
    },
    smartRewrites: generatedRewrites,
    sectionScores: {
      keywordMatch:    isGeneralAudit ? Math.min(95, Math.max(60, matched.length * 7 + 40)) : finalScore,
      skillsAlignment: Math.min(100, Math.round(finalScore * 0.95)),
      formattingATS:   fmt,
      experienceImpact:exp,
      metricDensity:   metric,
      educationCerts:  100,
      readabilityScore:Math.min(98, 70 + Math.round(lexDiv * 40)),
      actionVerbs:     hasVerbs ? Math.min(96, finalScore + 10) : Math.max(40, finalScore - 20)
    }
  };
}

function makeGeminiRequest(model, prompt, apiKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096, responseMimeType: 'application/json' }
    });
    const opts = {
      hostname: 'generativelanguage.googleapis.com', port: 443,
      path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            const candidate = parsed.candidates?.[0];
            const parts = candidate?.content?.parts || [];

            // Filter out thought parts, get text content
            let textContent = parts.filter(p => !p.thought).map(p => p.text || '').join('\n').trim();
            if (!textContent && parts.length > 0) {
              textContent = parts[parts.length - 1].text || '';
            }

            // Try direct JSON parse first (responseMimeType should give clean JSON)
            let a = null;
            try { a = JSON.parse(textContent); } catch(_) {}

            // Fallback: extract from fences or braces
            if (!a) {
              const fence = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
              const brace = textContent.match(/(\{[\s\S]*\})/);
              const str   = fence ? fence[1] : (brace ? brace[1] : null);
              if (!str) throw new Error('No JSON in Gemini response');
              a = JSON.parse(str);
            }

            const s = a.score ?? 75;
            const missingAll = a.missingKeywords || [...(a.missing_must_have_skills || []), ...(a.missing_nice_to_have_skills || [])];
            const recs = a.recommendations || a.actionable_fixes
              || (Array.isArray(a.gaps_and_recommendations)
                  ? a.gaps_and_recommendations.map(g => typeof g === 'object' ? `${g.issue}: ${g.actionable_fix}` : String(g))
                  : []);
            const rewrites = Array.isArray(a.smart_rewrites)
              ? a.smart_rewrites.map(r => ({ before: r.before || r.original || '', after: r.after || r.optimized || '', highlights: Array.isArray(r.highlights) ? r.highlights : [] }))
              : [];
            const hp = a.hiring_probability || {};
            const ss = a.section_scores || a.sectionScores || {};
            resolve({
              score: s,
              verdict: a.verdict || (s >= 85 ? 'SHORTLIST' : s >= 70 ? 'HOLD' : 'REJECT'),
              matchedKeywords: a.matchedKeywords || a.matching_keywords || [],
              missingKeywords: missingAll,
              recommendations: recs,
              recruiterVerdict: a.recruiter_verdict || a.recruiterVerdict || '',
              hiringProbability: {
                interview:  hp.interview || `${Math.min(99, s + 5)}%`,
                offer:      hp.offer || `${Math.min(95, s - 10)}%`,
                atsGatePass:hp.ats_gate_pass || hp.atsGatePass || `${Math.min(99, s + 8)}%`
              },
              smartRewrites: rewrites,
              sectionScores: {
                keywordMatch:    ss.keyword_match || ss.keywordMatch || s,
                skillsAlignment: ss.skills_alignment || ss.skillsAlignment || Math.min(100, Math.round(s * 0.95)),
                formattingATS:   ss.formatting_ats || ss.formattingATS || 95,
                experienceImpact:ss.experience_impact || ss.experienceImpact || (s < 50 ? 35 : 88),
                metricDensity:   ss.metric_density || ss.metricDensity || Math.max(40, s - 15),
                educationCerts:  ss.education_certs || ss.educationCerts || 100,
                readabilityScore:ss.readability_score || ss.readabilityScore || Math.min(98, 70 + Math.round(s / 5)),
                actionVerbs:     ss.action_verbs || ss.actionVerbs || Math.min(96, s + 5)
              }
            });
          } catch(e) { reject(new Error('Gemini parse: ' + e.message)); }
        } else { reject(new Error(`Gemini HTTP ${res.statusCode}: ${body.slice(0, 200)}`)); }
      });
    });
    req.on('error', e => reject(e));
    req.write(postData); req.end();
  });
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const b    = req.body || {};
    const cR   = sanitizeInputText(b.resumeText || b.resume_text || '');
    const cJD  = sanitizeInputText(b.jobDescription || b.jdText || b.targetJdText || '');
    const pref = b.preferredModel || b.geminiModel || '';
    const key  = process.env.GEMINI_API_KEY;

    if (!cR) return res.status(400).json({ error: 'Resume text is required for analysis.' });
    if (!key) return res.status(200).json(runServerFallbackAnalysis(cR, cJD));

    const isGeneralAudit = !cJD || cJD.length < 15;

    let prompt = '';
    if (isGeneralAudit) {
      prompt = `You are an expert Senior Technical Recruiter and ATS parser with 15+ years of FAANG-level hiring experience.

Analyze this Candidate Resume for a comprehensive GENERAL ATS HEALTH & QUALITY AUDIT (no specific target job provided).

===CANDIDATE RESUME===
${cR.slice(0, 4500)}

Evaluate:
1. Structural formatting and ATS parseability (sections, contact info, dates).
2. Action verb strength (proactive verbs vs passive tone).
3. Quantified metric density (%, $, numbers, latency, scale).
4. Extract all detected technical and professional skills into matchedKeywords.
5. Identify high-impact skills or certifications that could elevate this resume into missingKeywords.
6. Provide specific actionable recommendations to increase the candidate's ATS pass rate.
7. Rewrite weak experience bullet points into high-impact, ATS-optimized bullet points based on the candidate's actual background.

Respond STRICTLY with a single valid JSON object — no markdown fences, no prose outside JSON:
{
  "score": <integer 0-100 reflecting overall ATS readiness, typically 75-92 for good resumes>,
  "verdict": <"SHORTLIST"|"HOLD"|"REJECT">,
  "matchedKeywords": [<all detected skills in candidate resume>],
  "missingKeywords": [<recommended high-leverage skills to consider adding>],
  "recommendations": [<4-6 specific actionable strings>],
  "recruiter_verdict": "<2-3 sentence overall recruiter assessment of resume strength and ATS readiness>",
  "hiring_probability": { "interview": "<e.g. 85%>", "offer": "<e.g. 70%>", "ats_gate_pass": "<e.g. 92%>" },
  "smart_rewrites": [
    { "before": "<weak bullet from resume>", "after": "<ATS-optimized rewrite with metrics and strong verb>", "highlights": ["Verb: X","Metric: Y","Keyword: Z"] },
    { "before": "<weak bullet 2 from resume>", "after": "<ATS-optimized rewrite 2>", "highlights": ["Verb: A","Metric: B"] }
  ],
  "section_scores": {
    "keyword_match": <0-100>, "skills_alignment": <0-100>, "formatting_ats": <0-100>,
    "experience_impact": <0-100>, "metric_density": <0-100>, "education_certs": <0-100>,
    "readability_score": <0-100>, "action_verbs": <0-100>
  }
}`;
    } else {
      prompt = `You are an expert Senior Technical Recruiter and ATS parser with 15+ years of FAANG-level hiring experience.

Analyze the Candidate Resume against the Job Description for comprehensive ATS compatibility.

===JOB DESCRIPTION===
${cJD.slice(0, 3000)}

===CANDIDATE RESUME===
${cR.slice(0, 4000)}

Analyze: keyword overlap, missing skills, experience quality (action verbs, metrics), formatting, and hiring probability.

Respond STRICTLY with a single valid JSON object — no markdown fences, no prose outside JSON:
{
  "score": <integer 0-100>,
  "verdict": <"SHORTLIST"|"HOLD"|"REJECT">,
  "matchedKeywords": [<skills found in both>],
  "missingKeywords": [<required skills missing in resume>],
  "recommendations": [<4-6 specific actionable strings>],
  "recruiter_verdict": "<2-3 sentence direct recruiter assessment>",
  "hiring_probability": { "interview": "<e.g. 87%>", "offer": "<e.g. 72%>", "ats_gate_pass": "<e.g. 94%>" },
  "smart_rewrites": [
    { "before": "<weak bullet>", "after": "<ATS-optimized rewrite>", "highlights": ["Verb: X","Metric: Y","Keyword: Z"] },
    { "before": "<weak bullet 2>", "after": "<ATS-optimized rewrite 2>", "highlights": ["Verb: A","Metric: B"] }
  ],
  "section_scores": {
    "keyword_match": <0-100>, "skills_alignment": <0-100>, "formatting_ats": <0-100>,
    "experience_impact": <0-100>, "metric_density": <0-100>, "education_certs": <0-100>,
    "readability_score": <0-100>, "action_verbs": <0-100>
  }
}`;
    }

    const validModels = new Set(GEMINI_MODELS);
    const models = [...new Set([pref && validModels.has(pref) ? pref : null, ...GEMINI_MODELS].filter(Boolean))];
    let result = null;
    for (const model of models) {
      try { result = await makeGeminiRequest(model, prompt, key); if (result) break; }
      catch(e) { console.warn(`[ATS] ${model} failed:`, e.message); }
    }
    if (!result) {
      console.warn(`[ATS] All attempted Gemini models (${models.join(', ')}) failed. Executing server heuristic fallback analysis.`);
      result = runServerFallbackAnalysis(cR, cJD);
    }
    return res.status(200).json(result);
  } catch(err) {
    console.error('[ATS] Error:', err);
    const b = req.body || {};
    return res.status(200).json(runServerFallbackAnalysis(
      sanitizeInputText(b.resumeText || ''), sanitizeInputText(b.jobDescription || b.jdText || '')
    ));
  }
};

