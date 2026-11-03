const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** @param {import('../../models/user.js').User} user */
export function welcomeEmail(user) {
  return {
    to: user.email,
    subject: `Welcome, ${user.name}!`,
    html: `<h1>Welcome, ${escapeHtml(user.name)}!</h1><p>Thanks for signing up. Your account is ready.</p>`,
    text: `Welcome, ${user.name}!\n\nThanks for signing up. Your account is ready.`,
  };
}
