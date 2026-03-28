/** @type {import('ts-jest').JestConfigWithTsJest} */

module.exports = {
  //preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  globals: {},
};
