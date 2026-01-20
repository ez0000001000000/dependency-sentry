export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  testMatch: ['**/test/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 10000,
  passWithNoTests: true,
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|commander|inquirer|ora|semver|yargs)/)',
  ],
};
