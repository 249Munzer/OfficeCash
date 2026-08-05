import { useState, useCallback } from 'react';
import { ViewMode } from '../types';

export function useNavigation() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isFastEntryOpen, setIsFastEntryOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleNavigateWithGuard = useCallback((view: ViewMode) => {
    // If employee is logged in and trying to enter restricted Admin pages, require Admin auth
    // Note: This is a simplified version. The actual role check will be done in App.tsx
    setCurrentView(view);
  }, []);

  const openAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const openFastEntry = useCallback(() => {
    setIsFastEntryOpen(true);
  }, []);

  const closeFastEntry = useCallback(() => {
    setIsFastEntryOpen(false);
  }, []);

  return {
    currentView,
    setCurrentView,
    isFastEntryOpen,
    setIsFastEntryOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
    searchQuery,
    setSearchQuery,
    handleNavigateWithGuard,
    openAuthModal,
    closeAuthModal,
    openFastEntry,
    closeFastEntry,
  };
}