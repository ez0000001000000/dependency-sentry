# Dependency-Sentry 🛡️

[![npm version](https://badge.fury.io/js/dependency-sentry.svg)](https://badge.fury.io/js/dependency-sentry)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

> A powerful dependency checker and updater for Node.js projects that helps you keep your dependencies up-to-date and secure.

## Repository

📁 **GitHub**: https://github.com/ez0000001000000/dependency-sentry

> A powerful dependency checker and updater for Node.js projects that helps you keep your dependencies up-to-date and secure.

## Features ✨

- 🔍 **Check for outdated dependencies** - See which packages have newer versions available
- 🚨 **Vulnerability scanning** - Identify known security vulnerabilities in your dependencies
- ⚡ **Interactive updates** - Selectively update packages with an easy-to-use interface
- 🔄 **Multiple package manager support** - Works with npm, Yarn, and pnpm
- 🛡️ **Security first** - Highlights critical security issues
- 🎨 **Beautiful CLI output** - Color-coded and easy to read
- 🤖 **CI/CD friendly** - Can be used in automated environments

## Installation 📦

You can install `dep-sentry` globally to use it across all your projects:

```bash
npm install -g dep-sentry
# or
yarn global add dep-sentry
# or
pnpm add -g dep-sentry
```

Or use it directly with `npx` without installation:

```bash
npx dep-sentry
```

## Usage 🚀

### Basic Usage

Run `dep-sentry` in your project directory to check for outdated and vulnerable dependencies:

```bash
dep-sentry
```

### Options

```
Usage: dep-sentry [options]

Options:
  -V, --version        output the version number
  -c, --ci             Run in CI mode (non-interactive)
  -u, --update         Automatically update all dependencies
  -s, --security       Check for security vulnerabilities only
  -o, --outdated       Check for outdated packages only
  -h, --help           display help for command
```

### Examples

Check for security vulnerabilities only:
```bash
dep-sentry --security
```

Check for outdated packages only:
```bash
dep-sentry --outdated
```

Update all outdated dependencies without prompts:
```bash
dep-sentry --update
```

Run in CI mode (non-interactive):
```bash
dep-sentry --ci
```

## CI/CD Integration 🔄

You can integrate `dep-sentry` into your CI/CD pipeline to fail builds when vulnerabilities are found:

```yaml
# .github/workflows/security-check.yml
name: Security Check

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Run security check
        run: npx dep-sentry --ci
```

## Contributing 🤝

Contributions are welcome! Here's how you can help:

1. **Report bugs** - Open an issue to report any bugs you find
2. **Suggest features** - Have an idea? Share it in the issues
3. **Submit pull requests** - Help improve the codebase

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

- Inspired by tools like `npm-check`, `yarn outdated`, and `npm audit`
- Built with ❤️ and JavaScript

---

Made with [Node.js](https://nodejs.org/) and [Commander.js](https://github.com/tj/commander.js/)
