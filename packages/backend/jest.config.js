module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  reporters: ['default', ['jest-junit', { outputDirectory: 'reports', outputName: 'report.xml' }]],
  testTimeout: 120000,
  restoreMocks: true,
  maxWorkers: process.env.CODEBUILD_BUILD_ID ? 1 : '80%',
};
