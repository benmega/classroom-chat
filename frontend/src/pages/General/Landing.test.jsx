import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Landing from './Landing';
import useAuthStore from '../../store/useAuthStore';

vi.mock('./LandingDesktop', () => ({ default: () => <div>Landing Desktop Mock</div> }));
vi.mock('./LandingMobile', () => ({ default: () => <div>Landing Mobile Mock</div> }));

// The store is shared by every test in this file: start each from the signed-out state it has on load
const signedOut = useAuthStore.getState();

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const BackButton = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Back</button>;
};

// Opens "/" with the page before it in history, so Back can be checked
const renderLanding = () =>
  render(
    <MemoryRouter initialEntries={['/before', '/']} initialIndex={1}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Where />} />
      </Routes>
      <BackButton />
    </MemoryRouter>
  );

const signInAs = (user) => act(() => useAuthStore.setState({ user, isAuthenticated: true, isLoading: false }));

describe('Landing', () => {
  beforeEach(() => {
    useAuthStore.setState(signedOut, true);
  });

  it('shows the landing page to a signed-out visitor', () => {
    renderLanding();

    expect(screen.getByText('Landing Desktop Mock')).toBeInTheDocument();
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it.each([
    ['student', '/chat'],
    ['admin', '/admin/dashboard'],
    ['parent', '/parent/dashboard'],
  ])('sends a signed-in %s to %s', (role, path) => {
    renderLanding();

    signInAs({ username: 'someone', role });

    expect(screen.getByTestId('where')).toHaveTextContent(path);
  });

  it('replaces itself in history, so Back from the home page does not bounce through it', () => {
    renderLanding();
    signInAs({ username: 'someone', role: 'student' });
    expect(screen.getByTestId('where')).toHaveTextContent('/chat');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByTestId('where')).toHaveTextContent('/before');
  });
});
