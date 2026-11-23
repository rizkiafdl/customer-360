// Conventional Commits (CLAUDE.md Rule 7). Body and footer length are off
// because Dependabot bodies carry long release-note lines and URLs.
// defaultIgnores is off so that fixup!, squash!, amend!, and Merge commits
// fail: rebase merge would put them on main as they are.
export default {
  extends: ['@commitlint/config-conventional'],
  defaultIgnores: false,
  rules: { 'body-max-line-length': [0], 'footer-max-line-length': [0] },
}
