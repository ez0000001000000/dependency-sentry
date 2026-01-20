import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import semver from 'semver';
import { promisify } from 'util';
import chalk from 'chalk';

const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

/**
 * Checks for outdated dependencies in the project
 * @returns {Promise<Array>} Array of outdated packages
 */
async function checkDependencies() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  try {
    // Check if package.json exists and is accessible
    if (!packageJsonPath || typeof packageJsonPath !== 'string') {
      throw new Error('Invalid package.json path');
    }
    
    await access(packageJsonPath, fs.constants.F_OK);
    
    // Read package.json
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {},
      ...packageJson.peerDependencies || {}
    };

    // Get latest versions from npm
    const outdated = [];
    
    for (const [name, currentVersion] of Object.entries(allDeps)) {
      // Skip local file paths and git repositories
      if (currentVersion.startsWith('file:') || currentVersion.startsWith('git+')) {
        continue;
      }

      try {
        // Clean version string (remove ^, ~, etc.)
        const cleanVersion = currentVersion.replace(/^[\^~>=<]+/, '');
        
        // Get latest version from npm
        const latestVersion = getLatestVersion(name);
        
        if (latestVersion && semver.gt(latestVersion, cleanVersion)) {
          // Get the highest version that satisfies the current range
          let wantedVersion = semver.maxSatisfying(
            [latestVersion], 
            currentVersion
          ) || latestVersion;
          
          // Determine dependency type
          let type = 'prod';
          if (packageJson.devDependencies && packageJson.devDependencies[name]) {
            type = 'dev';
          } else if (packageJson.peerDependencies && packageJson.peerDependencies[name]) {
            type = 'peer';
          }
          
          outdated.push({
            name,
            current: currentVersion,
            latest: latestVersion,
            wanted: `^${wantedVersion}`,
            type
          });
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not check updates for ${name}: ${error.message}`));
      }
    }
    
    return outdated;
    
  } catch (error) {
    throw new Error(`Error checking dependencies: ${error.message}`);
  }
}

/**
 * Gets the latest version of a package from npm
 * @param {string} packageName - Name of the package
 * @returns {string|null} Latest version or null if not found
 */
function getLatestVersion(packageName) {
  try {
    const result = execSync(`npm view ${packageName} version --json`, { 
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 5000
    });
    
    return JSON.parse(result.trim());
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not fetch latest version for ${packageName}`));
    return null;
  }
}

/**
 * Gets the package manager used in the project
 * @returns {string} Package manager (npm, yarn, or pnpm)
 */
function detectPackageManager() {
  const cwd = process.cwd();
  
  // Validate current working directory
  if (!cwd || typeof cwd !== 'string') {
    console.warn(chalk.yellow('Warning: Invalid working directory, defaulting to npm'));
    return 'npm';
  }
  
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    return 'yarn';
  } else if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  return 'npm';
}

export {
  checkDependencies,
  detectPackageManager
};
