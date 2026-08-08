const { setCorsHeaders } = require('./_shared');

module.exports = async function handler(req, res) {
  setCorsHeaders(res, req);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = req.body || {};
    const email = body.email;
    const emailToUse = (email && typeof email === 'string' && email.trim()) ? email.trim() : 'developer@resuai.dev';
    const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);

    return res.status(200).json({
      success: true,
      token: token,
      user: { email: emailToUse, name: emailToUse.split('@')[0] || 'Developer' }
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      token: 'token_fallback_' + Date.now(),
      user: { email: 'developer@resuai.dev', name: 'Developer' }
    });
  }
};
