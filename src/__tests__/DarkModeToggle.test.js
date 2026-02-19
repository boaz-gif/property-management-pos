import { render, screen, fireEvent } from '@testing-library/react';
import DarkModeToggle from '../components/DarkModeToggle';

it('toggles dark mode', () => {
  render(<DarkModeToggle />);
  const button = screen.getByRole('button');
  fireEvent.click(button);
  expect(document.documentElement).toHaveClass('dark');
});