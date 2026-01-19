#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { checkDependencies } from './checker.js';
import { checkVulnerabilities } from './security.js';
import { updateDependencies } from './updater.js';

program
  .name('dep-sentry')
  .description('A powerful dependency checker and updater')
  .version('1.0.0')
  .option('-c, --ci', 'Run in CI mode (non-interactive)')
  .option('-u, --update', 'Automatically update all dependencies')
  .option('-s, --security', 'Check for security vulnerabilities only')
  .option('-o, --outdated', 'Check for outdated packages only');

program.parse(process.argv);

async function main() {
  const options = program.opts();
  const spinner = ora('Analyzing project...').start();

  try {
    if (options.security) {
      // Check for security vulnerabilities
      spinner.text = 'Checking for security vulnerabilities...';
      const vulnerabilities = await checkVulnerabilities();
      spinner.succeed('Security check completed');
      displayVulnerabilities(vulnerabilities);
      return;
    }

    if (options.outdated) {
      // Check for outdated packages
      spinner.text = 'Checking for outdated dependencies...';
      const outdated = await checkDependencies();
      spinner.succeed('Dependency check completed');
      displayOutdated(outdated);
      return;
    }

    // Full check (default)
    spinner.text = 'Checking dependencies...';
    const [outdated, vulnerabilities] = await Promise.all([
      checkDependencies(),
      checkVulnerabilities()
    ]);
    
    spinner.succeed('Dependency analysis completed');
    
    if (outdated.length > 0) {
      displayOutdated(outdated);
      
      if (options.update || (options.ci && !options.security)) {
        await updateDependencies(outdated, { auto: true });
      } else if (!options.ci) {
        const { update } = await inquirer.prompt([{
          type: 'confirm',
          name: 'update',
          message: 'Would you like to update outdated dependencies?',
          default: false
        }]);
        
        if (update) {
          await updateDependencies(outdated, { dev: true, peer: true });
        }
      }
    } else {
      console.log(chalk.green('✓ All dependencies are up to date!'));
    }
    
    if (vulnerabilities.length > 0) {
      displayVulnerabilities(vulnerabilities);
    } else {
      console.log(chalk.green('✓ No known vulnerabilities found!'));
    }
    
  } catch (error) {
    spinner.fail('An error occurred');
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}

function displayOutdated(outdated) {
  if (outdated.length === 0) {
    console.log(chalk.green('✓ All dependencies are up to date!'));
    return;
  }
  
  console.log('\n' + chalk.bold('Outdated Dependencies:'));
  console.log('='.repeat(80));
  console.log('Package'.padEnd(30) + 'Current'.padEnd(15) + 'Wanted'.padEnd(15) + 'Latest'.padEnd(15) + 'Type');
  console.log('-'.repeat(80));
  
  outdated.forEach(pkg => {
    console.log(
      chalk.blue(pkg.name.padEnd(30)) +
      pkg.current.padEnd(15) +
      chalk.yellow(pkg.wanted.padEnd(15)) +
      chalk.green(pkg.latest.padEnd(15)) +
      pkg.type
    );
  });
  console.log('\n');
}

function displayVulnerabilities(vulnerabilities) {
  if (vulnerabilities.length === 0) return;
  
  console.log('\n' + chalk.red.bold('Security Vulnerabilities:'));
  console.log('='.repeat(80));
  
  vulnerabilities.forEach((vuln, index) => {
    console.log(`\n${index + 1}. ${chalk.red.bold(vuln.name + '@' + vuln.version)}`);
    console.log(`   ${chalk.yellow('Severity:')} ${getSeverityColor(vuln.severity)(vuln.severity)}`);
    console.log(`   ${chalk.yellow('Vulnerable:')} ${vuln.vulnerable_versions}`);
    console.log(`   ${chalk.yellow('Fixed in:')} ${vuln.patched_versions || 'No fix available'}`);
    console.log(`   ${chalk.yellow('Advisory:')} ${vuln.advisory || 'No advisory available'}`);
    if (vuln.url) console.log(`   ${chalk.yellow('More info:')} ${vuln.url}`);
  });
  
  console.log('\n' + chalk.yellow('Run `npm audit` for more details.'));
}

function getSeverityColor(severity) {
  const colors = {
    critical: chalk.red.bold,
    high: chalk.red,
    moderate: chalk.yellow,
    low: chalk.blue,
    info: chalk.gray
  };
  return colors[severity.toLowerCase()] || chalk.white;
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('\nUnhandled rejection:', err);
  process.exit(1);
});

// Run the CLI
main();
