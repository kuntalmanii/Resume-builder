/**
 * ResuAI // Shared Serverless API Utilities & Constants
 */

const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-pro-exp-02-05',
  'gemini-1.5-pro',
  'gemini-1.5-flash'
];

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
    .replace(/<[^>]+>/g, '')
    .trim();
}

function setCorsHeaders(res, req) {
  if (!res || typeof res.setHeader !== 'function') return;
  const reqOrigin = req && req.headers ? req.headers.origin : null;
  const allowedOrigin = process.env.ALLOWED_ORIGIN || reqOrigin || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
}

module.exports = {
  GEMINI_MODELS,
  SHARED_TAXONOMY_KEYWORDS,
  sanitizeInputText,
  setCorsHeaders
};
