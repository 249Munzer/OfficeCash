/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * شاشة البداية (Splash Screen) — شعار OfficeCash متحرك بحركة مبتكرة:
 * 1) ارتسام كفاف الشعار (draw-in) عبر stroke animation.
 * 2) إشعاع وهج خلف الشعار (pulse glow).
 * 3) لمعان مائل يعبر الشعار دورياً (shimmer sweep).
 * 4) طفو ناعم مستمر (floating) لتأثير "التنفس".
 * 5) شريط تحميل أسفل الشاشة.
 * @module components/SplashScreen
 */

import React from 'react';
import { motion } from 'motion/react';
import { LOGO_PATH } from '../lib/logoPath';
import { makeT } from '../lib/i18n';

interface SplashScreenProps {
  language?: 'ar' | 'en';
  /** نص إضافي أسفل الشعار (مثل "جاري تحميل البيانات..."). الافتراضي من i18n */
  label?: string;
}

/**
 * شاشة بداية بتصميم Navy Premium مطابق لهوية OfficeCash.
 * @component
 * @example
 * <SplashScreen language={settings.language} />
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ language, label }) => {
  const t = makeT(language);
  const text = label ?? t('appLoading');

  return (
    <div
      dir="auto"
      className="splash-screen no-print fixed inset-0 z-[100] overflow-hidden"
      style={{
        background:
          'radial-gradient(1200px 800px at 50% 30%, #2447bf 0%, #1d4078 45%, #141f4d 100%)',
      }}
    >
      {/* شعاع مركزي خلف الشعار */}
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 'min(42vw, 420px)',
          height: 'min(42vw, 420px)',
          background:
            'radial-gradient(circle, rgba(150,181,248,0.28) 0%, rgba(150,181,248,0.08) 45%, transparent 70%)',
          filter: 'blur(8px)',
        }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.7, 1.05, 0.9, 1], opacity: [0, 1, 0.85, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      />

      <div className="relative h-full w-full flex flex-col items-center justify-center px-6">
        {/* الشعار */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 24, scale: 0.82 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* طفو ناعم مستمر */}
          <motion.div
            className="relative"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg
              viewBox="0 0 1024 1024"
              width="168"
              height="168"
              role="img"
              aria-label="OfficeCash"
              style={{ filter: 'drop-shadow(0 18px 40px rgba(2,6,23,0.45))' }}
            >
              {/* كفاف الشعار يُرسم ثم تظهر التعبئة */}
              <motion.path
                d={LOGO_PATH}
                fill="#ffffff"
                stroke="#ffffff"
                strokeWidth="14"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.7, ease: 'easeInOut' }}
              />
              {/* لمعان مائل يعبر الشعار */}
              <g clipPath="url(#ocSplashClip)">
                <motion.rect
                  x="-200"
                  y="0"
                  width="120"
                  height="1024"
                  fill="url(#ocSplashShimmer)"
                  transform="skewX(-18)"
                  initial={{ x: -260 }}
                  animate={{ x: 1280 }}
                  transition={{ duration: 1.6, delay: 1.9, repeat: Infinity, repeatDelay: 3.2, ease: 'easeInOut' }}
                />
              </g>
              <defs>
                <clipPath id="ocSplashClip">
                  <path d={LOGO_PATH} />
                </clipPath>
                <linearGradient id="ocSplashShimmer" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                  <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.5" />
                  <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        </motion.div>

        {/* اسم التطبيق */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease: 'easeOut' }}
        >
          <p
            className="text-white text-3xl font-extrabold tracking-wide"
            style={{ letterSpacing: '0.02em' }}
          >
            OfficeCash
          </p>
          <p className="mt-2 text-sm font-medium" style={{ color: 'rgba(224,234,255,0.72)' }}>
            {text}
          </p>
        </motion.div>

        {/* شريط التحميل */}
        <motion.div
          className="mt-12 h-1 w-52 overflow-hidden rounded-full"
          style={{ background: 'rgba(255,255,255,0.16)' }}
        >
          <motion.div
            className="h-full rounded-full bg-white"
            initial={{ width: '8%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
          />
        </motion.div>
      </div>

      {/* علامة السفلية */}
      <motion.p
        className="absolute bottom-6 left-0 right-0 text-center text-[11px] font-medium tracking-widest"
        style={{ color: 'rgba(224,234,255,0.45)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        OfficeCash · نظام إدارة الإيرادات اليومية
      </motion.p>
    </div>
  );
};
