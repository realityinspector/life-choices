// This file extends the @types/jest with custom matchers from @testing-library/jest-dom
import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeVisible(): R;
      toBeChecked(): R;
      toHaveClass(className: string): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveStyle(style: Record<string, any>): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeInvalid(): R;
      toBeValid(): R;
      toBeRequired(): R;
      toHaveFocus(): R;
      toHaveValue(value: string | string[] | number): R;
      toContainHTML(html: string): R;
      toContainElement(element: HTMLElement | null): R;
    }
  }
}