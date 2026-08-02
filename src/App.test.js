import { render, screen } from '@testing-library/react';
import App from './App';

test('renders checagem manual heading', () => {
  render(<App />);
  const heading = screen.getByText(/checagem manual/i);
  expect(heading).toBeInTheDocument();
});
