import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import DuckTransactions from './DuckTransactions';

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../../hooks/useSidebar', () => ({
  default: () => ({ toggleSidebar: vi.fn() }),
  useSidebar: () => ({ toggleSidebar: vi.fn() }),
}));

import client from '../../api/client';

const mockTransactions = [
  {
    id: 1,
    username: 'alice',
    nickname: 'Alice',
    amount: 10,
    reason: 'Quiz reward',
    timestamp: '2024-01-15T10:30:00',
  },
  {
    id: 2,
    username: 'bob',
    nickname: null,
    amount: -5,
    reason: 'Shop purchase',
    timestamp: '2024-01-15T11:00:00',
  },
];

const successResponse = {
  data: {
    status: 'success',
    data: {
      transactions: mockTransactions,
      total: 2,
      pages: 1,
    },
  },
};

const emptyResponse = {
  data: {
    status: 'success',
    data: {
      transactions: [],
      total: 0,
      pages: 1,
    },
  },
};

const renderComponent = (route = '/admin/transactions') =>
  renderWithProviders(<DuckTransactions />, { route });

describe('DuckTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    client.get.mockImplementation(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByText(/Loading transactions/i)).toBeInTheDocument();
  });

  it('renders page title after loading', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => expect(screen.getByText('Duck Transactions')).toBeInTheDocument());
  });

  it('renders transaction table headers', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Reason')).toBeInTheDocument();
      expect(screen.getByText('Date & Time')).toBeInTheDocument();
    });
  });

  it('renders transaction rows with user data', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('@alice')).toBeInTheDocument();
      expect(screen.getByText('Quiz reward')).toBeInTheDocument();
    });
  });

  it('renders username when nickname is null', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => {
      // bob has no nickname, so username is shown
      expect(screen.getByText('@bob')).toBeInTheDocument();
    });
  });

  it('renders positive amount with + prefix', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('+10 🦆')).toBeInTheDocument();
    });
  });

  it('renders negative amount correctly', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('-5 🦆')).toBeInTheDocument();
    });
  });

  it('shows empty state message when no transactions', async () => {
    client.get.mockResolvedValue(emptyResponse);
    renderComponent();
    await waitFor(() =>
      expect(
        screen.getByText(/No transactions found matching your criteria/i)
      ).toBeInTheDocument()
    );
  });

  it('renders filter tabs: All, Earned, Spent', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('All Transactions')).toBeInTheDocument();
      expect(screen.getByText('Ducks Earned (+)')).toBeInTheDocument();
      expect(screen.getByText('Ducks Spent (-)')).toBeInTheDocument();
    });
  });

  it('All Transactions tab is active by default', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => {
      const allTab = screen.getByText('All Transactions');
      expect(allTab.closest('button')).toHaveClass('active');
    });
  });

  it('clicking Earned tab updates the active tab', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => screen.getByText('Ducks Earned (+)'));

    const earnedTab = screen.getByText('Ducks Earned (+)');
    fireEvent.click(earnedTab);

    await waitFor(() => {
      expect(earnedTab.closest('button')).toHaveClass('active');
    });
  });

  it('renders search input', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(/Search by user or reason/i)
      ).toBeInTheDocument()
    );
  });

  it('submits search form', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Search by user or reason/i)).toBeInTheDocument()
    );

    const input = screen.getByPlaceholderText(/Search by user or reason/i);
    fireEvent.change(input, { target: { value: 'alice' } });
    const form = input.closest('form');
    fireEvent.submit(form);

    // After submit, fetchTransactions is re-called with search param
    await waitFor(() => expect(client.get).toHaveBeenCalledTimes(2));
  });

  it('renders Export CSV button', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => expect(screen.getByText(/Export CSV/i)).toBeInTheDocument());
  });

  it('renders Back to Dashboard link', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() =>
      expect(screen.getByText(/Back to Dashboard/i)).toBeInTheDocument()
    );
  });

  it('renders pagination when transactions exist', async () => {
    const paginatedResponse = {
      data: {
        status: 'success',
        data: {
          transactions: mockTransactions,
          total: 40,
          pages: 2,
        },
      },
    };
    client.get.mockResolvedValue(paginatedResponse);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Previous/i)).toBeInTheDocument();
      expect(screen.getByText(/Next/i)).toBeInTheDocument();
    });
  });

  it('Previous button is disabled on first page', async () => {
    const paginatedResponse = {
      data: {
        status: 'success',
        data: { transactions: mockTransactions, total: 40, pages: 2 },
      },
    };
    client.get.mockResolvedValue(paginatedResponse);
    renderComponent();
    await waitFor(() => {
      const prevBtn = screen.getByText(/Previous/i).closest('button');
      expect(prevBtn).toBeDisabled();
    });
  });

  it('renders reason text for transactions', async () => {
    client.get.mockResolvedValue(successResponse);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Shop purchase')).toBeInTheDocument();
    });
  });

  it('renders "No reason provided" for transaction without reason', async () => {
    const noReasonResponse = {
      data: {
        status: 'success',
        data: {
          transactions: [{ id: 5, username: 'user5', nickname: null, amount: 5, reason: null, timestamp: null }],
          total: 1,
          pages: 1,
        },
      },
    };
    client.get.mockResolvedValue(noReasonResponse);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('No reason provided')).toBeInTheDocument();
    });
  });
});
