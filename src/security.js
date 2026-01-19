const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const chalk = require('chalk');
const fetch = require('node-fetch');

// Cache for vulnerability data
const vulnerabilityCache = new Map();

/**
 * Checks for security vulnerabilities in the project's dependencies
 * @returns {Promise<Array>} Array of vulnerabilities
 */
async function checkVulnerabilities() {
  try {
    // First, try to use npm audit if available
    if (await hasNpmAudit()) {
      return await checkWithNpmAudit();
    }
    
    // Fallback to checking known vulnerabilities via the npm registry
    return await checkWithNpmRegistry();
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not check for vulnerabilities: ${error.message}`));
    return [];
  }
}

/**
 * Checks if npm audit is available
 * @returns {Promise<boolean>} True if npm audit is available
 */
async function hasNpmAudit() {
  try {
    execSync('npm audit --json', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks for vulnerabilities using npm audit
 * @returns {Promise<Array>} Array of vulnerabilities
 */
async function checkWithNpmAudit() {
  try {
    const result = execSync('npm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(result);
    
    if (!audit.vulnerabilities) {
      return [];
    }
    
    const vulnerabilities = [];
    
    for (const [name, data] of Object.entries(audit.vulnerabilities)) {
      if (data.via) {
        const vuln = Array.isArray(data.via) ? data.via[0] : data.via;
        
        if (vuln) {
          vulnerabilities.push({
            name,
            severity: data.severity,
            title: vuln.title || 'Unknown vulnerability',
            url: vuln.url || '',
            vulnerable_versions: data.range || '*',
            patched_versions: vuln.fixedIn ? `>=${vuln.fixedIn}` : 'No fix available',
            advisory: vuln.advisory || ''
          });
        }
      }
    }
    
    return vulnerabilities;
  } catch (error) {
    throw new Error(`Failed to run npm audit: ${error.message}`);
  }
}

/**
 * Checks for vulnerabilities using the npm registry
 * @returns {Promise<Array>} Array of vulnerabilities
 */
async function checkWithNpmRegistry() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    const allDeps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {},
      ...packageJson.peerDependencies || {}
    };
    
    const vulnerabilities = [];
    
    for (const [name, version] of Object.entries(allDeps)) {
      // Skip local file paths and git repositories
      if (typeof version !== 'string' || version.startsWith('file:') || version.startsWith('git+')) {
        continue;
      }
      
      try {
        const pkgVulnerabilities = await getPackageVulnerabilities(name, version);
        vulnerabilities.push(...pkgVulnerabilities);
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not check vulnerabilities for ${name}@${version}: ${error.message}`));
      }
    }
    
    return vulnerabilities;
  } catch (error) {
    throw new Error(`Failed to check vulnerabilities: ${error.message}`);
  }
}

/**
 * Gets vulnerabilities for a specific package version
 * @param {string} name - Package name
 * @param {string} version - Package version
 * @returns {Promise<Array>} Array of vulnerabilities
 */
async function getPackageVulnerabilities(name, version) {
  const cacheKey = `${name}@${version}`;
  
  // Check cache first
  if (vulnerabilityCache.has(cacheKey)) {
    return vulnerabilityCache.get(cacheKey);
  }
  
  try {
    const response = await fetch(`https://registry.npmjs.org/${name}/${version}`, {
      headers: { 'Accept': 'application/vnd.npm.install-v1+json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const vulnerabilities = [];
    
    if (data.vulnerabilities) {
      for (const vuln of Object.values(data.vulnerabilities)) {
        vulnerabilities.push({
          name,
          version,
          severity: vuln.severity || 'moderate',
          title: vuln.title || 'Unknown vulnerability',
          url: vuln.url || `https://www.npmjs.com/advisories/${vuln.id}`,
          vulnerable_versions: vuln.vulnerable_versions || '*',
          patched_versions: vuln.patched_versions || 'No fix available',
          advisory: vuln.overview || ''
        });
      }
    }
    
    // Cache the result
    vulnerabilityCache.set(cacheKey, vulnerabilities);
    return vulnerabilities;
    
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not fetch vulnerability data for ${name}@${version}: ${error.message}`));
    return [];
  }
}

module.exports = {
  checkVulnerabilities
};
