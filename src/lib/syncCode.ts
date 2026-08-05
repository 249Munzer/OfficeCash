// إنشاء رمز مزامنة شبكة فريد وعالي العشوائية لكل مكتب جديد
// يشمل الأحرف غير الملتبسة فقط (بدون 0/O و 1/I) لسهولة القراءة والكتابة

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomIndex(): number {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const arr = new Uint32Array(1);
    cryptoObj.getRandomValues(arr);
    return arr[0] % CHARSET.length;
  }
  return Math.floor(Math.random() * CHARSET.length);
}

export function generateSyncCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CHARSET[randomIndex()];
    if (i === 3) code += '-';
  }
  return `P2P-${code}`;
}
