/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * شعار OfficeCash الرسمي (علامة الماركة) — SVG متجه مأخوذ من assets/logo.png
 * بدقة تتبع مطابقة (potrace). يورّث لون النص عبر currentColor ليسهل تلوينه
 * على الخلفيات الفاتحة والداكنة.
 * @module components/AppLogo
 */

import React from 'react';
import { LOGO_PATH } from '../lib/logoPath';

interface AppLogoProps {
  /** حجم الشعار بكسل (الطول = العرض). الافتراضي 40. */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** عنوان الصورة لأغراض الوصولية (يتجاهله قارئات الشاشة عند الكشف) */
  'aria-label'?: string;
}

/**
 * علامة الشعار المتجهة.
 * @component
 * @example
 * <AppLogo size={48} className="text-blue-600" />
 */
export const AppLogo: React.FC<AppLogoProps> = ({
  size = 40,
  className,
  style,
  ...rest
}) => (
  <svg
    viewBox="0 0 1024 1024"
    width={size}
    height={size}
    className={className}
    style={style}
    fill="currentColor"
    role="img"
    aria-hidden={rest['aria-label'] ? undefined : true}
    aria-label={rest['aria-label']}
  >
    <path d={LOGO_PATH} />
  </svg>
);
