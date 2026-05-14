import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import { Button } from './Button/Button';
import { Modal } from './Modal/Modal';
import { Spinner } from './Spinner/Spinner';

describe('Button snapshots', () => {
  afterEach(cleanup);

  it('renders primary variant', () => {
    const { container } = render(<Button variant="primary">Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders secondary variant', () => {
    const { container } = render(<Button variant="secondary">Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders ghost variant', () => {
    const { container } = render(<Button variant="ghost">Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders danger variant', () => {
    const { container } = render(<Button variant="danger">Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders small size', () => {
    const { container } = render(<Button size="sm">Small</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders medium size', () => {
    const { container } = render(<Button size="md">Medium</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders large size', () => {
    const { container } = render(<Button size="lg">Large</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders loading state', () => {
    const { container } = render(<Button loading>Loading</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders disabled state', () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders full width', () => {
    const { container } = render(<Button fullWidth>Full Width</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe('Modal snapshots', () => {
  afterEach(cleanup);

  it('renders closed state (null)', () => {
    const { container } = render(<Modal open={false} onClose={() => {}}>Content</Modal>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders open state', () => {
    const { container } = render(<Modal open onClose={() => {}} title="Test Modal">Content</Modal>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with footer', () => {
    const { container } = render(
      <Modal open onClose={() => {}} title="Modal with Footer" footer={<button>Action</button>}>
        Content
      </Modal>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders small size', () => {
    const { container } = render(<Modal open onClose={() => {}} size="sm">Small Modal</Modal>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders large size', () => {
    const { container } = render(<Modal open onClose={() => {}} size="lg">Large Modal</Modal>);
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe('Spinner snapshots', () => {
  afterEach(cleanup);

  it('renders small size', () => {
    const { container } = render(<Spinner size="sm" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders medium size', () => {
    const { container } = render(<Spinner size="md" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders large size', () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with custom color', () => {
    const { container } = render(<Spinner color="#ff0000" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe('Button accessibility', () => {
  afterEach(cleanup);

  it('loading button has aria-busy', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('disabled button has disabled attribute', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('Spinner accessibility', () => {
  afterEach(cleanup);

  it('has aria-label by default', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
