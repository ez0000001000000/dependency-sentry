import { jest } from '@jest/globals';
import { checkDependencies, detectPackageManager } from '../src/checker.js';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock fs module
jest.unstable_mockModule('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn()
  }
}));

const { default: fsMock } = await import('fs');

describe('detectPackageManager', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns npm by default', () => {
    fsMock.existsSync.mockReturnValue(false);
    const result = detectPackageManager();
    expect(result).toBe('npm');
  });

  test('returns yarn when yarn.lock exists', () => {
    fsMock.existsSync.mockImplementation(path => 
      path.endsWith('yarn.lock')
    );
    const result = detectPackageManager();
    expect(result).toBe('yarn');
  });
});

describe('checkDependencies', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('handles missing package.json', async () => {
    fsMock.existsSync.mockReturnValue(false);
    await expect(checkDependencies())
      .rejects
      .toThrow('package.json not found');
  });

  test('returns empty array for empty dependencies', async () => {
    fsMock.existsSync.mockReturnValue(true);
    fsMock.promises.readFile.mockResolvedValue(JSON.stringify({
      name: 'test',
      version: '1.0.0'
    }));
    
    const result = await checkDependencies();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
