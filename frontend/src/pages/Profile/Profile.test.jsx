import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Profile from './index';
import { useProfile } from '../../hooks/useProfile';

vi.mock('../../hooks/useProfile', () => ({
  useProfile: vi.fn(),
}));

// Mock subcomponents to avoid rendering errors or needing heavy state setup
vi.mock('../../components/profile/ProfileHeader', () => ({
  default: () => <div data-testid="profile-header">ProfileHeader</div>
}));
vi.mock('../../components/profile/CourseProgress', () => ({
  default: () => <div data-testid="course-progress">CourseProgress</div>
}));
vi.mock('../../components/profile/CertificationsList', () => ({
  default: () => <div data-testid="certifications-list">CertificationsList</div>
}));
vi.mock('../../components/profile/AchievementsList', () => ({
  default: () => <div data-testid="achievements-list">AchievementsList</div>
}));
vi.mock('../../components/profile/TechnicalSkills', () => ({
  default: () => <div data-testid="technical-skills">TechnicalSkills</div>
}));
vi.mock('../../components/profile/ProjectPortfolio', () => ({
  default: () => <div data-testid="project-portfolio">ProjectPortfolio</div>
}));
vi.mock('../../components/profile/ContributionGraph', () => ({
  default: () => <div data-testid="contribution-graph">ContributionGraph</div>
}));
vi.mock('../../components/profile/DigitalNotebook', () => ({
  default: () => <div data-testid="digital-notebook">DigitalNotebook</div>
}));
vi.mock('../../components/profile/ProjectModal', () => ({
  default: () => <div data-testid="project-modal">ProjectModal</div>
}));
vi.mock('../../components/profile/NoteSlideshow', () => ({
  default: () => <div data-testid="note-slideshow">NoteSlideshow</div>
}));
vi.mock('../../components/profile/PfpCropModal', () => ({
  default: () => <div data-testid="pfp-crop-modal">PfpCropModal</div>
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Profile Page Component', () => {
  const defaultProfileData = {
    target: {
      bio: 'Hello, I am a test student!',
      certificates: [],
      achievements: [],
      skills: [],
      projects: [],
      contribution_data: {},
      notes: [],
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    useProfile.mockReturnValue({
      isLoading: true,
      profileData: null,
    });

    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );

    expect(screen.getByText('Loading Profile...')).toBeInTheDocument();
  });

  it('renders error state when profile data is not found', () => {
    useProfile.mockReturnValue({
      isLoading: false,
      profileData: null,
    });

    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );

    expect(screen.getByText('Profile not found.')).toBeInTheDocument();
  });

  it('renders about me section with bio', () => {
    useProfile.mockReturnValue({
      isLoading: false,
      profileData: defaultProfileData,
      isOwner: false,
    });

    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );

    expect(screen.getByText('About Me')).toBeInTheDocument();
    expect(screen.getByText('Hello, I am a test student!')).toBeInTheDocument();
  });

  it('renders edit button when user is owner', () => {
    useProfile.mockReturnValue({
      isLoading: false,
      profileData: defaultProfileData,
      isOwner: true,
    });

    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );

    const editBtn = screen.getByTitle('Edit Profile');
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('renders sub-components correctly', () => {
    useProfile.mockReturnValue({
      isLoading: false,
      profileData: defaultProfileData,
      isOwner: false,
    });

    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );

    expect(screen.getByTestId('profile-header')).toBeInTheDocument();
    expect(screen.getByTestId('course-progress')).toBeInTheDocument();
    expect(screen.getByTestId('certifications-list')).toBeInTheDocument();
    expect(screen.getByTestId('achievements-list')).toBeInTheDocument();
    expect(screen.getByTestId('technical-skills')).toBeInTheDocument();
    expect(screen.getByTestId('project-portfolio')).toBeInTheDocument();
    expect(screen.getByTestId('contribution-graph')).toBeInTheDocument();
    expect(screen.getByTestId('digital-notebook')).toBeInTheDocument();
    expect(screen.getByTestId('project-modal')).toBeInTheDocument();
    expect(screen.getByTestId('note-slideshow')).toBeInTheDocument();
    expect(screen.getByTestId('pfp-crop-modal')).toBeInTheDocument();
  });
});
