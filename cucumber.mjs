export default {
  paths: ['specs/**/*.feature'],
  import: ['tests/e2e/support/**/*.ts', 'tests/e2e/steps/**/*.ts'],
  tags: '@e2e',
  format: ['progress', 'html:cucumber-report/index.html', 'json:cucumber-report/results.json'],
  publishQuiet: true,
}
