import React from 'react';
import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('should render', async () => {
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelector('.app-view')).toBeInTheDocument();
    });
  });
});
