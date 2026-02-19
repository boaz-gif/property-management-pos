import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  test('renders spinner with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status', { name: /loading/i });
    expect(spinner).toHaveClass('animate-spin');
    expect(spinner).toHaveClass('h-8');
    expect(spinner).toHaveClass('w-8');
    expect(spinner).toHaveClass('border-blue-500');
  });

  test('renders spinner with custom props', () => {
    render(<LoadingSpinner size="h-12 w-12" color="border-red-500" />);
    const spinner = screen.getByRole('status', { name: /loading/i });
    expect(spinner).toHaveClass('h-12');
    expect(spinner).toHaveClass('w-12');
    expect(spinner).toHaveClass('border-red-500');
  });
});
