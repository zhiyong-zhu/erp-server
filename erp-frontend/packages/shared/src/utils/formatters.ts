import dayjs from 'dayjs';

export function formatDate(date: string | Date | number, format = 'YYYY-MM-DD'): string {
  if (!date) return '-';
  return dayjs(date).format(format);
}

export function formatDateTime(date: string | Date | number): string {
  if (!date) return '-';
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

export function formatNumber(num: number, decimals = 2): string {
  if (num == null || isNaN(num)) return '-';
  return num.toFixed(decimals);
}

export function formatMoney(amount: number, decimals = 2): string {
  if (amount == null || isNaN(amount)) return '-';
  return `¥${amount.toFixed(decimals)}`;
}
