# Contributing to Node.js Backend Template

Thank you for your interest in contributing to this project! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nodejs-backend-boilerplate.git
   cd nodejs-backend-boilerplate
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/devSahinur/nodejs-backend-boilerplate.git
   ```

## Development Setup

### Prerequisites

- Node.js v18+ (v21.7.1 recommended)
- MongoDB v7.0+
- Redis v6.0+
- npm or yarn

### Installation

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your local configuration.

3. **Start required services**:

   ```bash
   # MongoDB
   brew services start mongodb-community  # macOS
   # or
   sudo systemctl start mongod  # Linux

   # Redis
   brew services start redis  # macOS
   # or
   sudo systemctl start redis  # Linux
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## Project Structure

```
nodejs-backend-template/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middlewares/     # Custom middlewares
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validations/     # Request validation schemas
│   ├── queues/          # Bull queue jobs
│   ├── app.ts           # Express app setup
│   └── index.ts         # Server entry point
├── tests/               # Test files
├── public/              # Static files
└── logs/                # Application logs
```

## Development Workflow

### Creating a New Feature

1. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding standards

3. **Test your changes**:

   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes** (see [Commit Guidelines](#commit-guidelines))

5. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## Coding Standards

### JavaScript/ES6+

- Use ES6+ features (arrow functions, destructuring, async/await)
- Use ESM (ES Modules) syntax with `.js` extensions
- Follow the existing code style (enforced by ESLint)
- Use meaningful variable and function names
- Keep functions small and focused (single responsibility)

### File Naming

- Use kebab-case for filenames: `user-service.ts`
- Use PascalCase for model files: `User.model.ts`
- Add appropriate suffixes: `.controller.ts`, `.service.ts`, `.validation.ts`

### Code Organization

- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Models**: Define database schemas
- **Middlewares**: Handle cross-cutting concerns
- **Validations**: Define request validation schemas

### ES Modules

Always use ES6 module syntax:

```javascript
// Good - Named and default exports
export default {
  createUser,
  getUser,
};

export { createUser, getUser };

// Good - Imports
import userService from './services/user.service.js';
import { createUser } from './services/user.service.js';
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring without adding features or fixing bugs
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates

### Examples

```bash
feat(auth): add JWT refresh token functionality

Implement refresh token rotation for improved security.
Tokens expire after 7 days and are automatically refreshed.

Closes #123
```

```bash
fix(email): resolve SMTP connection timeout

Updated email service configuration to handle connection pooling
and added retry logic for failed sends.
```

```bash
docs(readme): update installation instructions

Added prerequisite version requirements and troubleshooting section.
```

## Pull Request Process

### Before Submitting

1. **Update your branch** with latest upstream changes:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks**:

   ```bash
   npm test
   npm run lint
   ```

3. **Update documentation** if needed

4. **Add/update tests** for new features

### PR Description

Include in your PR description:

- **What**: Brief description of changes
- **Why**: Reason for the changes
- **How**: Implementation approach
- **Testing**: How you tested the changes
- **Screenshots**: If applicable (for UI changes)

### PR Title

Follow the same convention as commit messages:

```
feat(auth): add OAuth2 authentication
fix(validation): correct email regex pattern
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests

- Place tests in `__tests__` directories next to the code they test
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies

Example:

```javascript
describe('User Service', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const userData = { email: 'test@example.com', password: 'Test123!' };

      // Act
      const user = await userService.createUser(userData);

      // Assert
      expect(user).toHaveProperty('id');
      expect(user.email).toBe(userData.email);
    });
  });
});
```

## Documentation

### Code Comments

- Use JSDoc for functions and classes
- Explain "why" not "what" in comments
- Keep comments up-to-date with code changes

Example:

```javascript
/**
 * Create a new user account
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User's email address
 * @param {string} userData.password - User's password (will be hashed)
 * @returns {Promise<User>} Created user object
 * @throws {ApiError} If email is already taken
 */
const createUser = async (userData) => {
  // Implementation
};
```

### API Documentation

- Update Swagger/OpenAPI documentation for API changes
- Include request/response examples
- Document error responses

### README Updates

Update README.md when adding:

- New features
- New environment variables
- New dependencies
- Changed setup instructions


---
