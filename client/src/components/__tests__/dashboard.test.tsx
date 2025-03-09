import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '../dashboard';
import { UserProvider } from '../../context/user-context';

// Mock the onViewChange function
const mockOnViewChange = jest.fn();

// Mock the queryClient for API requests
jest.mock('../../lib/queryClient', () => ({
  queryClient: {
    getQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  },
  apiRequest: jest.fn(),
  getQueryFn: () => jest.fn().mockResolvedValue([]),
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Reset the mock function before each test
    mockOnViewChange.mockClear();
  });

  it('renders the dashboard with correct elements', () => {
    render(
      <UserProvider>
        <Dashboard onViewChange={mockOnViewChange} />
      </UserProvider>
    );
    
    // Check if the dashboard renders important elements
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  it('calls onViewChange when changing views', () => {
    render(
      <UserProvider>
        <Dashboard onViewChange={mockOnViewChange} />
      </UserProvider>
    );
    
    // Find and click a button or link that should trigger view change
    // This is a simplified example and may need to be adjusted based on your component
    const viewButton = screen.getByText(/Activities/i);
    fireEvent.click(viewButton);
    
    // Check if the onViewChange callback was called with the correct parameter
    expect(mockOnViewChange).toHaveBeenCalledWith('activities');
  });
});