import { useCallback } from 'react';
import { DayClosing } from '../types';

export function useDayClosings(
  _dayClosings: DayClosing[],
  _setDayClosings: React.Dispatch<React.SetStateAction<DayClosing[]>>,
  saveDayClosing: (closing: DayClosing) => Promise<void>,
  broadcastP2PChange: () => void
) {
  const handleSaveDayClosing = useCallback(async (closing: DayClosing) => {
    await saveDayClosing(closing);
    broadcastP2PChange();
  }, [saveDayClosing, broadcastP2PChange]);

  return {
    handleSaveDayClosing,
  };
}