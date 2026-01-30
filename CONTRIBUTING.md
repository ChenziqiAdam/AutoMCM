# Contributing

## Setup

```bash
git clone <repo>
cd AutoMCM
npm install
cp .env.example .env
# Add API key to .env
```

## Structure

```
src/
├── agents/        # Master + specialized agents
├── core/          # Config, workspace, RAG
├── tools/         # Python, LaTeX, web
└── validators/    # Dimensional validator
```

## Standards

**Code Style**:
- ES6+ modules
- async/await for async code
- JSDoc comments for public methods
- Small, focused functions (KISS)

**Naming**:
- Classes: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: `kebab-case.js`

**Error Handling**:
```javascript
try {
  await operation();
} catch (error) {
  console.error('Failed:', error.message);
  throw new Error(`Operation failed: ${error.message}`);
}
```

## Testing

```bash
npm test           # Run all tests
```

Add tests in `test/`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert';

test('Feature', async (t) => {
  await t.test('should work', async () => {
    assert.ok(result);
  });
});
```

## Workflow

1. Create branch: `git checkout -b feature/name`
2. Implement feature
3. Add tests
4. Update docs
5. Update PROCESS.md
6. Submit PR

## Pull Requests

- All tests must pass
- Include documentation
- Follow KISS principle
- Reference issues

## Questions?

- Check [PLAN.md](PLAN.md) for architecture
- See [docs/USAGE.md](docs/USAGE.md) for API
- Review [PROCESS.md](PROCESS.md) for status

## License

MIT
