import { render, screen } from '@testing-library/react';
import SundialChart from '../sundial-chart';
import { UserProvider } from '../../../context/user-context';
import { jest, expect, describe, it } from '@jest/globals';

// Mock D3 functionality
jest.mock('d3', () => ({
  select: jest.fn().mockReturnValue({
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    exit: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    pie: jest.fn().mockReturnThis(),
    arc: jest.fn().mockReturnThis(),
  }),
  pie: jest.fn().mockReturnValue({
    value: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  }),
  arc: jest.fn().mockReturnValue({
    innerRadius: jest.fn().mockReturnThis(),
    outerRadius: jest.fn().mockReturnThis(),
    startAngle: jest.fn().mockReturnThis(),
    endAngle: jest.fn().mockReturnThis(),
    padAngle: jest.fn().mockReturnThis(),
  }),
}));

// Mock the queryClient for API requests
jest.mock('../../../lib/queryClient', () => ({
  queryClient: {
    getQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  },
  apiRequest: jest.fn(),
  getQueryFn: jest.fn().mockImplementation(() => ({ 
    on401: 'returnNull',
    queryFn: jest.fn().mockResolvedValue([]) 
  })),
}));

describe('SundialChart Component', () => {
  it('renders the chart component', () => {
    render(
      <UserProvider>
        <SundialChart />
      </UserProvider>
    );
    
    // Check if the SVG element is rendered
    const svgElement = document.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
  });

  it('renders with the correct className', () => {
    const testClassName = 'test-class';
    render(
      <UserProvider>
        <SundialChart className={testClassName} />
      </UserProvider>
    );
    
    // Test if the provided className is applied to the component
    const chartContainer = document.querySelector(`.${testClassName}`);
    expect(chartContainer).toBeInTheDocument();
  });
});