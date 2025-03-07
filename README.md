This is the [assistant-ui](https://github.com/Yonom/assistant-ui) starter project for langgraph.

## Getting Started

First, add your configuration to `.env.local`. You have two options for setup:

### Option 1: Using the Next.js API Proxy (Recommended)

This approach keeps your API key secure on the server side.

```
# Server-side only - used by the Next.js API route
LANGSMITH_API_KEY=your_api_key
LANGGRAPH_API_URL=your_langgraph_api_url

# Public - safe to expose to the client
NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID=your_assistant_id_or_graph_id
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Note

Ensure `pnpm` is installed before running any commands. You can install it globally using the following command:

```bash
npm install -g pnpm
```

## Testing

This project uses a comprehensive testing strategy to ensure code quality and reliability. Here's an overview of our testing approach:

### Test Structure

Tests are organized under the `__tests__` directory, mirroring the main codebase structure:

- `/components` - React component tests
- `/api` - API route tests
- `/app` - Next.js app router tests
- `/lib` - Utility function tests
- `/pages` - Page component tests

### Testing Stack

- **Framework**: Jest
- **Component Testing**: React Testing Library
- **API Testing**: Jest mocking capabilities
- **Authentication**: Mock Auth0 integration
- **Internationalization**: i18next integration

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Key Testing Practices

1. **Component Testing**

   - User-centric testing with React Testing Library
   - Testing both success and error states
   - Async testing for streaming and API interactions
   - Comprehensive mocking of external dependencies

2. **API Testing**

   - Mock HTTP requests
   - Environment-aware testing (preview vs production)
   - Authentication flow testing
   - Middleware testing

3. **Authentication Testing**

   - Mock Auth0 integration
   - Environment-specific testing
   - Protected route validation
   - Mock user scenarios for development

4. **Best Practices**
   - Test isolation
   - Error state coverage
   - Async operation testing
   - Proper mocking strategies
   - Environment variable management

### Writing Tests

When adding new features, ensure:

1. Tests are added in the corresponding `__tests__` directory
2. Both success and error cases are covered
3. External dependencies are properly mocked
4. Tests follow the existing patterns in similar test files

For component testing example:

```typescript
import { render, screen } from '@testing-library/react';
import YourComponent from './YourComponent';

describe('YourComponent', () => {
  it('renders successfully', () => {
    render(<YourComponent />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
```
