// Tests for PackageList component - simplified version

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock dependencies
vi.mock('@prism/core', async () => {
  const actual = await vi.importActual('@prism/core');
  return {
    ...actual,
    globalRegistry: {
      getNode: vi.fn(),
      unregisterCustomNode: vi.fn(),
    },
  };
});

// Helper to create test stored packages
const createTestPackage = (name = 'test-package', nodeTypes = ['test/node1', 'test/node2']) => ({
  manifest: {
    name,
    version: '1.0.0',
    description: 'A test package',
  },
  nodeTypes,
  loadedAt: new Date().toISOString(),
});

// Import after mocks are set up
import { PackageList } from './PackageList';

describe('PackageList', () => {
  const mockOnNodesRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('prism-node-packages', '[]');
    mockOnNodesRefresh.mockClear();
  });

  describe('empty state', () => {
    it('shows empty message when no packages', () => {
      render(<PackageList onNodesRefresh={mockOnNodesRefresh} />);

      expect(document.querySelector('.package-list-empty')).toBeInTheDocument();
    });
  });

  describe('package display', () => {
    it('renders list of packages', async () => {
      const packages = [
        createTestPackage('package-a'),
        createTestPackage('package-b'),
      ];
      localStorage.setItem('prism-node-packages', JSON.stringify(packages));

      render(<PackageList onNodesRefresh={mockOnNodesRefresh} />);

      await waitFor(() => {
        const packageItems = document.querySelectorAll('.package-item');
        expect(packageItems.length).toBe(2);
      });
    });

    it('shows package name and version', async () => {
      const packages = [createTestPackage('my-package')];
      localStorage.setItem('prism-node-packages', JSON.stringify(packages));

      render(<PackageList onNodesRefresh={mockOnNodesRefresh} />);

      await waitFor(() => {
        expect(document.querySelector('.package-name')?.textContent).toBe('my-package');
        expect(document.querySelector('.package-version')?.textContent).toBe('v1.0.0');
      });
    });
  });

  describe('delete functionality', () => {
    it('shows confirmation dialog before delete', async () => {
      const packages = [createTestPackage('test-package')];
      localStorage.setItem('prism-node-packages', JSON.stringify(packages));

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<PackageList onNodesRefresh={mockOnNodesRefresh} />);

      await waitFor(() => {
        expect(document.querySelector('.package-item')).toBeInTheDocument();
      });

      // Click delete button
      const deleteBtn = document.querySelector('.package-delete-btn');
      fireEvent.click(deleteBtn!);

      expect(confirmSpy).toHaveBeenCalledWith(
        '确定要删除包"test-package"吗？这将移除所有相关节点。'
      );
      confirmSpy.mockRestore();
    });

    it('deletes package when confirmed', async () => {
      const packages = [createTestPackage('test-package')];
      localStorage.setItem('prism-node-packages', JSON.stringify(packages));

      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const { globalRegistry } = await import('@prism/core');
      (globalRegistry.unregisterCustomNode as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

      render(<PackageList onNodesRefresh={mockOnNodesRefresh} />);

      await waitFor(() => {
        expect(document.querySelector('.package-item')).toBeInTheDocument();
      });

      // Click delete
      const deleteBtn = document.querySelector('.package-delete-btn');
      fireEvent.click(deleteBtn!);

      await waitFor(() => {
        expect(document.querySelector('.package-list-empty')).toBeInTheDocument();
      });

      expect(globalRegistry.unregisterCustomNode).toHaveBeenCalled();
      expect(mockOnNodesRefresh).toHaveBeenCalled();
    });

    it('does not delete when cancelled', async () => {
      const packages = [createTestPackage('test-package')];
      localStorage.setItem('prism-node-packages', JSON.stringify(packages));

      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<PackageList onNodesRefresh={mockOnNodesRefresh} />);

      await waitFor(() => {
        expect(document.querySelector('.package-item')).toBeInTheDocument();
      });

      // Click delete
      const deleteBtn = document.querySelector('.package-delete-btn');
      fireEvent.click(deleteBtn!);

      expect(document.querySelector('.package-item')).toBeInTheDocument();
      expect(mockOnNodesRefresh).not.toHaveBeenCalled();
    });
  });

  describe('expand/collapse', () => {
    it('shows expand button', async () => {
      const packages = [createTestPackage('test-package')];
      localStorage.setItem('prism-node-packages', JSON.stringify(packages));

      render(<PackageList onNodesRefresh={mockOnNodesRefresh} />);

      await waitFor(() => {
        expect(document.querySelector('.package-expand-btn')).toBeInTheDocument();
      });
    });

    it('expands on click', async () => {
      const packages = [createTestPackage('test-package')];
      localStorage.setItem('prism-node-packages', JSON.stringify(packages));

      render(<PackageList onNodesRefresh={mockOnNodesRefresh} />);

      await waitFor(() => {
        expect(document.querySelector('.package-item')).toBeInTheDocument();
      });

      const expandBtn = document.querySelector('.package-expand-btn');
      fireEvent.click(expandBtn!);

      await waitFor(() => {
        expect(document.querySelector('.package-body')).toBeInTheDocument();
      });
    });
  });
});