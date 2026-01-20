import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';
import fetch from 'node-fetch';

const readFile = promisify(fs.readFile);

// Cache for vulnerability data
const vulnerabilityCache = new Map();

/**
 * Checks for security vulnerabilities in the project's dependencies
 * @returns {Promise<Array>} Array of vulnerabilities
 */
async function checkVulnerabilities() {
  try {
    // Validate current working directory
    const cwd = process.cwd();
    if (!cwd || typeof cwd !== 'string') {
      console.warn(chalk.yellow('Warning: Invalid working directory, skipping vulnerability check'));
      return [];
    }
    
    // Use npm audit as the primary method
    return await checkWithNpmAudit();
  } catch (error) {
    // If npm audit fails, try a simple fallback
    console.warn(chalk.yellow(`Warning: Could not run npm audit: ${error.message}`));
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
    const result = execSync('npm audit --json', { 
      encoding: 'utf8', 
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10000 // 10 second timeout
    });
    
    const audit = JSON.parse(result);
    
    if (!audit.vulnerabilities || Object.keys(audit.vulnerabilities).length === 0) {
      return [];
    }
    
    const vulnerabilities = [];
    
    for (const [name, data] of Object.entries(audit.vulnerabilities)) {
      if (data.via && data.via.length > 0) {
        const vuln = data.via[0];
        
        if (vuln && typeof vuln === 'object') {
          vulnerabilities.push({
            name,
            severity: data.severity || 'moderate',
            title: vuln.title || 'Unknown vulnerability',
            url: vuln.url || '',
            vulnerable_versions: data.range || '*',
            patched_versions: vuln.fixedIn ? `>=${vuln.fixedIn}` : 'No fix available',
            advisory: vuln.advisory || '',
            version: data.version || 'unknown'
          });
        }
      }
    }
    
    return vulnerabilities;
  } catch (error) {
    // Check if this is just "no vulnerabilities found"
    if (error.stdout && error.stdout.includes('found 0 vulnerabilities')) {
      return [];
    }
    
    // Check if error message indicates no vulnerabilities
    if (error.message && error.message.includes('found 0 vulnerabilities')) {
      return [];
    }
    
    // Check if npm audit failed but we can still proceed
    if (error.status === 1 && error.message.includes('npm audit')) {
      // npm audit found vulnerabilities, let's try to parse the output
      try {
        if (error.stdout) {
          const audit = JSON.parse(error.stdout);
          if (audit.vulnerabilities) {
            const vulnerabilities = [];
            for (const [name, data] of Object.entries(audit.vulnerabilities)) {
              vulnerabilities.push({
                name,
                severity: data.severity || 'moderate',
                title: 'Security vulnerability detected',
                url: '',
                vulnerable_versions: data.range || '*',
                patched_versions: 'Run npm audit fix',
                advisory: 'Run npm audit for details',
                version: 'unknown'
              });
            }
            return vulnerabilities;
          }
        }
      } catch (parseError) {
        // If we can't parse, just return empty
        return [];
      }
    }
    
    // For any other error, return empty array (don't fail the whole tool)
    console.warn(chalk.yellow(`Warning: npm audit failed, skipping vulnerability check`));
    return [];
  }
}


export {
  checkVulnerabilities
};
