# Repository Commit Guidelines

## ❌ NEVER Commit These Files/Types

### 1. Environment Variables (.env files)
- **DANGER**: Contains database credentials, API keys, JWT secrets
- Examples: `.env`, `.env.local`, `.env.production`
- **Risk**: Complete system compromise if exposed

### 2. Authentication Tokens & Credentials
- Any files containing tokens, API keys, passwords
- Examples: `*_token.txt`, `admin_token.txt`, `*.token`
- **Risk**: Unauthorized access to systems

### 3. Debug & Test Output Files
- Temporary debug logs and test results
- Examples: `*_debug.txt`, `*_error.txt`, `*_output.txt`
- **Risk**: Information disclosure, cluttering repository

### 4. API Test Response Files
- Files containing API responses with sensitive data
- Examples: `*_response.json`, `api-test-report*.json`
- **Risk**: Data leakage, exposing system internals

### 5. Development & Testing Scripts
- Scripts that were just for testing purposes
- Examples: `login-test.js`, `test-api.js`, `simple-test.js`
- **Risk**: Confusing other developers, exposing testing methods

### 6. Node Modules & Package Lock Files (controversial)
- `node_modules/` (ALWAYS ignore)
- `package-lock.json` (some teams commit, some don't - decide as a team)

## ✅ SAFE to Commit

### 1. Source Code
- All `.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.java`, etc. files
- Backend API code, frontend components, utilities

### 2. Configuration Files (without secrets)
- `package.json`, `webpack.config.js`, `tailwind.config.js`
- Database schema files (without passwords)
- Route definitions, middleware code

### 3. Documentation
- README.md, API documentation
- Code comments and JSDoc
- Architecture diagrams

### 4. Static Assets
- Images, icons, fonts (unless sensitive)
- Public HTML, CSS files

### 5. Database Schema & Seeds
- `schema.sql`, `seeds.sql` (if they don't contain passwords)
- Migration files

### 6. Build Configuration
- Docker files, CI/CD configs
- Deployment scripts (without credentials)

## 🛡️ Security Best Practices

### Before Every Commit:
1. **Review your changes**: `git diff --staged`
2. **Check for secrets**: Search for common patterns
   - `password`, `secret`, `key`, `token`, `auth`
   - Connection strings with credentials
3. **Verify .gitignore**: Ensure sensitive files are excluded
4. **Use environment variables**: Move hardcoded values to .env

### If You Accidentally Commit Sensitive Data:
1. **Stop immediately** - don't make more commits
2. **Remove from history**: `git reset --soft HEAD~1`
3. **Re-stage clean files only**
4. **Force push if already pushed**: `git push --force-with-lease`

## 🔍 Quick Checklist

Before committing, ask yourself:
- [ ] Does this file contain any passwords, tokens, or API keys?
- [ ] Is this file necessary for other developers to run the project?
- [ ] Does this file contain temporary or debug information?
- [ ] Is this file already covered by .gitignore?

## 📁 Current Repository Status

### ✅ Clean Files (Safe to Commit)
- All source code files (`backend/src/`)
- Configuration files (package.json, webpack, etc.)
- Documentation (README.md)
- Database schemas and seeds
- Public frontend assets

### ❌ Removed Files (Already Unstaged)
- `.env` files (contains MongoDB and database credentials)
- `*_token.txt` files (authentication tokens)
- `*_response.json` files (API responses with sensitive data)
- `*_debug.txt`, `*_error.txt` files (debug output)
- Test scripts (`login-test.js`, `test-api.js`, etc.)

## 🔐 Environment Setup

For team members to run this project:
1. Copy `.env.example` to `.env` (create this template)
2. Fill in their own database credentials
3. Never commit the actual `.env` file

Remember: **When in doubt, don't commit it!**
