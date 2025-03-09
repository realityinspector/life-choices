import { render, screen } from '@testing-library/react';
import Header from '../header';

// Create a mock user data for testing that matches the UserData type
const mockUserData = {
  id: 1,
  username: 'testuser',
  name: 'Test User',
  age: 30,
  lifeExpectancy: 85,
  sleepHours: 8,
  password: 'password', // Adding password field for UserData compatibility
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('Header Component', () => {
  it('renders without user data', () => {
    render(<Header />);
    // Check if the component renders the app name
    expect(screen.getByText(/Sundial/i)).toBeInTheDocument();
  });

  it('renders with user data', () => {
    render(<Header userData={mockUserData} />);
    // Check if it displays the user's name
    expect(screen.getByText(/Test User/i)).toBeInTheDocument();
  });
});