import { useCallback } from 'react';
import { DayClosing } from '../types';

/**
 * Hook عملية حفظ إغلاق اليوم + بث P2P.
 * يغلف `saveDayClosing` من `useAppState` ويُشغّل `broadcastP2PChange` بعد الحفظ.
 * @param _dayClosings - مصفوفة الإغلاقات (للاعتمادية)
 * @param _setDayClosings - setter للحالة
 * @param saveDayClosing - دالة حفظ من useAppState
 * @param broadcastP2PChange - دالة بث التغيير لأجهزة الشبكة
 * @returns {Object} دالة `handleSaveDayClosing`
 */
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