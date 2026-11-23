// Conventional Commits (CLAUDE.md Rule 7). Body and footer length are off
// because Dependabot bodies carry long release-note lines and URLs.
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
}
