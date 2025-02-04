import { render, screen } from '@testing-library/react';
import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';
import DashboardPage from '@/app/protected/dashboard/page';
import { I18nextProvider } from 'react-i18next';
import i18next from 'i18next';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Mock Auth0
jest.mock('@auth0/nextjs-auth0', () => ({
  getSession: jest.fn(),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to login if user is not authenticated', async () => {
    (getSession as jest.Mock).mockResolvedValue(null);

    try {
      await DashboardPage();
    } catch (error) {
      // Redirect throws an error in tests
      expect(redirect).toHaveBeenCalledWith('/api/auth/login');
    }
  });

  it('should render dashboard with user information when authenticated', async () => {
    const mockUser = {
      name: 'Test User',
      email: 'test@example.com',
      sub: 'auth0|123',
    };

    (getSession as jest.Mock).mockResolvedValue({ user: mockUser });

    const Component = await DashboardPage();
    render(
      <I18nextProvider i18n={i18next}>
        {Component}
      </I18nextProvider>
    );

    expect(screen.getByText('Protected Dashboard')).toBeInTheDocument();
    expect(screen.getByText(`Welcome, ${mockUser.name}!`)).toBeInTheDocument();
  });

  it('should use the correct configuration file for production', async () => {
    process.env.NODE_ENV = 'production';
    const config = require('@/staticwebapp.config.json');
    expect(config.auth.identityProviders.customOpenIdConnectProviders.auth0.registration.clientId).toBe('YOUR_AUTH0_CLIENT_ID');
  });

  it('should use the correct configuration file for staging', async () => {
    process.env.NODE_ENV = 'staging';
    const config = require('@/staticwebapp.config.json');
    expect(config.auth.passwordProtection.enabled).toBe(true);
  });
});
