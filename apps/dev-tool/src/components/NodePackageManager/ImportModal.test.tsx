// Tests for ImportModal component - simplified version

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { ImportModal } from './ImportModal';

// Mock dependencies
vi.mock('@prism/shared-types', async () => {
  const actual = await vi.importActual('@prism/shared-types');
  return {
    ...actual,
    safeValidateNodePackage: vi.fn(),
  };
});

vi.mock('@prism/core', async () => {
  const actual = await vi.importActual('@prism/core');
  return {
    ...actual,
    globalRegistry: {
      initialize: vi.fn(),
      getNode: vi.fn(),
      registerNode: vi.fn(),
      registerExecutor: vi.fn(),
    },
    parseInlineExecutor: vi.fn(),
  };
});

// Helper to create a valid test manifest
const createTestManifest = (overrides = {}) => ({
  name: 'test-package',
  version: '1.0.0',
  definitions: [
    {
      type: 'test/node',
      label: 'Test Node',
      category: 'transform',
      description: 'A test node',
      inputs: [{ id: 'in', name: 'in', type: 'image', dataType: 'IMAGE' }],
      outputs: [{ id: 'out', name: 'out', type: 'image', dataType: 'IMAGE' }],
      params: [],
    },
  ],
  executors: [
    {
      id: 'test/node',
      source: { type: 'inline', code: 'return inputs;' },
    },
  ],
  ...overrides,
});

// Mock File with text() method for jsdom
function createMockFile(content: string, filename: string): File {
  const blob = new Blob([content], { type: 'application/json' });
  // Create a mock file that supports text()
  const file = new File([blob], filename) as File & { text: () => Promise<string> };
  file.text = async () => content;
  return file;
}

describe('ImportModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial render', () => {
    it('renders modal with dropzone in idle state', () => {
      render(
        <ImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(document.querySelector('.dialog-overlay')).toBeInTheDocument();
      expect(document.querySelector('.dialog')).toBeInTheDocument();
      expect(document.querySelector('.dialog-title')?.textContent).toBe('导入节点包');
    });

    it('shows dropzone text', () => {
      render(
        <ImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(document.querySelector('.import-dropzone-text')).toBeInTheDocument();
    });

    it('shows cancel button in idle state', () => {
      render(
        <ImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const cancelButton = document.querySelector('.dialog-btn-secondary');
      expect(cancelButton?.textContent).toBe('取消');
    });

    it('renders format hint', () => {
      render(
        <ImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      expect(document.querySelector('.import-format-hint')).toBeInTheDocument();
    });
  });

  describe('file selection', () => {
    it('shows error for invalid JSON', async () => {
      const { safeValidateNodePackage } = await import('@prism/shared-types');

      (safeValidateNodePackage as ReturnType<typeof vi.fn>).mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['name'], message: 'Name is required' }],
        },
      });

      render(
        <ImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const mockFile = createMockFile('invalid json', 'test.json');

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(document.querySelector('.import-error')).toBeInTheDocument();
      });
    });

    it('shows error for already registered node type', async () => {
      const { safeValidateNodePackage } = await import('@prism/shared-types');
      const { globalRegistry } = await import('@prism/core');

      (safeValidateNodePackage as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: createTestManifest(),
      });
      (globalRegistry.initialize as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      (globalRegistry.getNode as ReturnType<typeof vi.fn>).mockReturnValue({ type: 'test/node' });

      render(
        <ImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const mockFile = createMockFile(JSON.stringify(createTestManifest()), 'test.json');

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(document.querySelector('.import-error')).toBeInTheDocument();
      });
    });

    it('shows success state after import', async () => {
      const { safeValidateNodePackage } = await import('@prism/shared-types');
      const { globalRegistry, parseInlineExecutor } = await import('@prism/core');

      (safeValidateNodePackage as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: createTestManifest(),
      });
      (globalRegistry.initialize as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      (globalRegistry.getNode as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (parseInlineExecutor as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());

      render(
        <ImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const mockFile = createMockFile(JSON.stringify(createTestManifest()), 'test.json');

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      });

      await waitFor(() => {
        expect(document.querySelector('.import-success')).toBeInTheDocument();
      });

      expect(document.querySelector('.import-success')?.textContent).toContain('导入成功');
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  describe('close behavior', () => {
    it('closes on cancel button click when idle', () => {
      render(
        <ImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const cancelButton = document.querySelector('.dialog-btn-secondary');
      fireEvent.click(cancelButton!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes on overlay click when idle', () => {
      render(
        <ImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const overlay = document.querySelector('.dialog-overlay');
      fireEvent.click(overlay!);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('drag and drop', () => {
    it('applies active class on drag over', () => {
      render(
        <ImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const dropzone = document.querySelector('.import-dropzone');
      fireEvent.dragOver(dropzone!);

      expect(dropzone?.classList.contains('import-dropzone-active')).toBe(true);
    });

    it('removes active class on drag leave', () => {
      render(
        <ImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
      );

      const dropzone = document.querySelector('.import-dropzone');
      fireEvent.dragOver(dropzone!);
      fireEvent.dragLeave(dropzone!);

      expect(dropzone?.classList.contains('import-dropzone-active')).toBe(false);
    });
  });
});