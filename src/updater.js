import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { detectPackageManager } from './checker.js';
import semver from 'semver';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/**
 * Updates the specified dependencies
 * @param {Array} outdated - Array of outdated packages
 * @param {Object} options - Options for the update
 * @param {boolean} [options.auto=false] - Whether to update without confirmation
 * @param {boolean} [options.dev=false] - Whether to update devDependencies
 * @param {boolean} [options.peer=false] - Whether to update peerDependencies
 * @returns {Promise<void>}
 */
async function updateDependencies(outdated, options = {}) {
  const { auto = false, dev = false, peer = false } = options;
  
  // Validate current working directory
  const cwd = process.cwd();
  if (!cwd || typeof cwd !== 'string') {
    throw new Error('Invalid working directory');
  }
  
  const packageManager = detectPackageManager();
  const packageJsonPath = path.join(cwd, 'package.json');
  
  // Validate package.json path
  if (!packageJsonPath || typeof packageJsonPath !== 'string') {
    throw new Error('Invalid package.json path');
  }
  
  try {
    // Read package.json
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    let updates = [];
    
    // Filter updates based on options
    if (auto) {
      updates = [...outdated];
    } else {
      // Interactive mode - let user select which packages to update
      const choices = outdated.map(pkg => ({
        name: `${pkg.name.padEnd(30)} ${pkg.current.padEnd(15)} → ${chalk.green(pkg.latest)} (${pkg.type})`,
        value: pkg,
        checked: true
      }));
      
      const { selected } = await inquirer.prompt([{
        type: 'checkbox',
        name: 'selected',
        message: 'Select packages to update:',
        choices,
        pageSize: Math.min(20, choices.length + 2)
      }]);
      
      updates = selected;
    }
    
    if (updates.length === 0) {
      console.log(chalk.yellow('No packages selected for update.'));
      return;
    }
    
    // Group updates by type
    const updatesByType = {
      prod: updates.filter(pkg => pkg.type === 'prod'),
      dev: updates.filter(pkg => pkg.type === 'dev'),
      peer: updates.filter(pkg => pkg.type === 'peer')
    };
    
    // Update package.json
    let updated = false;
    
    // Update dependencies
    if (updatesByType.prod.length > 0) {
      await updateDependenciesInPackageJson(packageJson, 'dependencies', updatesByType.prod);
      updated = true;
    }
    
    // Update devDependencies
    if (dev && updatesByType.dev.length > 0) {
      await updateDependenciesInPackageJson(packageJson, 'devDependencies', updatesByType.dev);
      updated = true;
    }
    
    // Update peerDependencies
    if (peer && updatesByType.peer.length > 0) {
      await updateDependenciesInPackageJson(packageJson, 'peerDependencies', updatesByType.peer);
      updated = true;
    }
    
    if (updated) {
      // Write updated package.json
      await writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + '\n',
        'utf8'
      );
      
      console.log(chalk.green('✓ Updated package.json'));
      
      // Install updated dependencies
      console.log(chalk.blue('Installing updated dependencies...'));
      
      try {
        if (packageManager === 'yarn') {
          execSync('yarn install', { stdio: 'inherit' });
        } else if (packageManager === 'pnpm') {
          execSync('pnpm install', { stdio: 'inherit' });
        } else {
          execSync('npm install', { stdio: 'inherit' });
        }
        
        console.log(chalk.green('✓ Successfully updated dependencies!'));
      } catch (error) {
        console.error(chalk.red('\nError installing updated dependencies:'));
        console.error(chalk.red(error.message));
        console.log('\nYou may need to manually run `npm install` to complete the update.');
      }
    } else {
      console.log(chalk.yellow('No updates were made.'));
    }
    
  } catch (error) {
    throw new Error(`Failed to update dependencies: ${error.message}`);
  }
}

/**
 * Updates dependencies in package.json
 * @param {Object} packageJson - The package.json object
 * @param {string} depType - The dependency type ('dependencies', 'devDependencies', etc.)
 * @param {Array} updates - Array of packages to update
 * @returns {Promise<void>}
 */
async function updateDependenciesInPackageJson(packageJson, depType, updates) {
  if (!packageJson[depType]) {
    packageJson[depType] = {};
  }
  
  for (const pkg of updates) {
    const currentVersion = packageJson[depType][pkg.name];
    
    if (currentVersion) {
      // Preserve the original version specifier (^, ~, etc.)
      const prefix = getVersionPrefix(currentVersion);
      packageJson[depType][pkg.name] = `${prefix}${pkg.latest}`;
      
      console.log(chalk.green(`✓ Updated ${pkg.name} from ${currentVersion} to ${prefix}${pkg.latest} (${depType})`));
    }
  }
}

/**
 * Gets the version prefix (^, ~, etc.) from a version string
 * @param {string} version - The version string
 * @returns {string} The version prefix
 */
function getVersionPrefix(version) {
  const match = version.match(/^([~^>=<]*)/);
  return match ? match[0] : '';
}

export {
  updateDependencies
};
