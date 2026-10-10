import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isBefore, parseISO } from 'date-fns';
import type { InterestLevel, BookingStage } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseToISODate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  try {
    const d1 = parseISO(trimmed);
    if (!isNaN(d1.getTime())) {
      return format(d1, 'yyyy-MM-dd');
    }
  } catch {}

  try {
    const d2 = new Date(trimmed);
    if (!isNaN(d2.getTime())) {
      return format(d2, 'yyyy-MM-dd');
    }
  } catch {}

  return trimmed;
}

export function formatDate(dateStr: string | null | undefined, fmt = 'd MMM yyyy'): string {
  if (!dateStr) return '—';
  try {
    const d1 = parseISO(dateStr);
    if (!isNaN(d1.getTime())) {
      return format(d1, fmt);
    }
    const d2 = new Date(dateStr);
    if (!isNaN(d2.getTime())) {
      return format(d2, fmt);
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d1 = parseISO(dateStr);
    if (!isNaN(d1.getTime())) {
      return format(d1, 'd MMM yyyy, hh:mm a');
    }
    const d2 = new Date(dateStr);
    if (!isNaN(d2.getTime())) {
      return format(d2, 'd MMM yyyy, hh:mm a');
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    return isBefore(parseISO(dateStr), new Date()) && !isToday(parseISO(dateStr));
  } catch {
    return false;
  }
}

export function isDueToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    return isToday(parseISO(dateStr));
  } catch {
    return false;
  }
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0';
  return new Intl.NumberFormat('en-IN').format(n);
}

export function normalizePhoneNumber(rawPhone: string | null | undefined): string {
  if (!rawPhone) return '';
  
  let str = String(rawPhone)
    .replace(/[\uFEFF\u00A0\u200E\u200F?]/g, '')
    .trim();

  let digits = str.replace(/\D/g, '');
  if (!digits) return '';

  // Handle double 91 prefix (e.g. 91919447218781 -> 919447218781)
  while (digits.startsWith('9191') && digits.length >= 14) {
    digits = digits.slice(2);
  }

  // Handle leading 0 (e.g. 09447218781 -> 9447218781)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Standard 10-digit Indian Mobile
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  // 12-digit Indian Mobile with 91 prefix
  if (digits.length === 12 && digits.startsWith('91')) {
    const core = digits.slice(2);
    return `+91 ${core.slice(0, 5)} ${core.slice(5)}`;
  }

  // Handle cases where digits start with 91 and have 10 core digits
  if (digits.startsWith('91') && digits.length > 10) {
    const core = digits.slice(2);
    if (core.length === 10) {
      return `+91 ${core.slice(0, 5)} ${core.slice(5)}`;
    }
  }

  return `+${digits}`;
}

export function formatPhoneNumber(rawPhone: string | null | undefined): string {
  return normalizePhoneNumber(rawPhone);
}

export function getWhatsAppLink(phone: string, message?: string): string {
  let clean = String(phone || '').replace(/\D/g, '');
  while (clean.startsWith('9191') && clean.length >= 14) {
    clean = clean.slice(2);
  }
  if (clean.length === 11 && clean.startsWith('0')) {
    clean = clean.slice(1);
  }
  if (clean.length === 10) {
    clean = `91${clean}`;
  }
  const base = `https://wa.me/${clean}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function getCallLink(phone: string): string {
  const norm = normalizePhoneNumber(phone);
  const cleanDigits = norm.replace(/\s+/g, '');
  return `tel:${cleanDigits || phone}`;
}

export function interestLevelOrder(level: InterestLevel): number {
  const order: Record<InterestLevel, number> = {
    not_interested: 0,
    new: 1,
    low_interest: 2,
    interested: 3,
    high_intent: 4,
  };
  return order[level] ?? 1;
}

export function bookingStageOrder(stage: BookingStage): number {
  const order: Record<BookingStage, number> = {
    not_contacted: 0,
    contacted: 1,
    follow_up_required: 2,
    waiting_for_date: 3,
    waiting_for_price: 4,
    ready_to_book: 5,
    advance_paid: 6,
    booking_confirmed: 7,
    lost_closed: 8,
  };
  return order[stage] ?? 0;
}

export function truncate(str: string | null | undefined, max = 60): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const MONTH_MAP: Record<string, { numStr: string; monthIndex: number; aliases: string[] }> = {
  jan: { numStr: '01', monthIndex: 0, aliases: ['jan', 'january'] },
  feb: { numStr: '02', monthIndex: 1, aliases: ['feb', 'february'] },
  mar: { numStr: '03', monthIndex: 2, aliases: ['mar', 'march'] },
  apr: { numStr: '04', monthIndex: 3, aliases: ['apr', 'april'] },
  may: { numStr: '05', monthIndex: 4, aliases: ['may'] },
  jun: { numStr: '06', monthIndex: 5, aliases: ['jun', 'june'] },
  jul: { numStr: '07', monthIndex: 6, aliases: ['jul', 'july'] },
  aug: { numStr: '08', monthIndex: 7, aliases: ['aug', 'august'] },
  sep: { numStr: '09', monthIndex: 8, aliases: ['sep', 'september'] },
  oct: { numStr: '10', monthIndex: 9, aliases: ['oct', 'october'] },
  nov: { numStr: '11', monthIndex: 10, aliases: ['nov', 'november'] },
  dec: { numStr: '12', monthIndex: 11, aliases: ['dec', 'december'] },
};

export function isPreferredDateInMonth(dateStr: string | null | undefined, monthQuery: string): boolean {
  if (!monthQuery || monthQuery === 'all') return true;
  if (!dateStr || !dateStr.trim()) return false;

  const pd = dateStr.toLowerCase().trim();
  const mq = monthQuery.toLowerCase().trim();

  // Find month info
  const entry = Object.entries(MONTH_MAP).find(
    ([key, info]) => key === mq || info.aliases.includes(mq)
  );

  if (!entry) {
    return pd.includes(mq);
  }

  const [_, { numStr, monthIndex, aliases }] = entry;

  // 1. Text alias match (e.g. "nov", "november", "Nov 07, 08", "15 Nov 2026")
  if (aliases.some((alias) => pd.includes(alias))) {
    return true;
  }

  // 2. ISO or numeric month pattern check (e.g. "2026-11-12", "11/05/2026")
  if (pd.includes(`-${numStr}-`) || pd.includes(`/${numStr}/`) || pd.includes(`-${numStr}`) || pd.startsWith(`${numStr}/`)) {
    return true;
  }

  // 3. Try date parse
  try {
    const parsed = new Date(pd);
    if (!isNaN(parsed.getTime())) {
      if (parsed.getMonth() === monthIndex) {
        return true;
      }
    }
  } catch {
    // Ignore error
  }

  return false;
}

export interface WeekendOption {
  label: string;
  value: string;
  satDateStr: string;
  sunDateStr: string;
}

export function generateUpcomingWeekends(monthsCount = 3): WeekendOption[] {
  const options: WeekendOption[] = [
    {
      label: '✨ Any Future Trip / Flexible Date',
      value: 'Any Future Trip',
      satDateStr: '',
      sunDateStr: '',
    },
  ];

  const today = new Date();
  const endDate = new Date(today);
  endDate.setMonth(today.getMonth() + monthsCount);

  // Add month quick-filters at the top of Preferred Date dropdown!
  for (let i = 0; i < monthsCount; i++) {
    const mDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const mLabel = mDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const mVal = mDate.toLocaleString('en-US', { month: 'short' }).toLowerCase();
    options.push({
      label: `📅 ${mLabel} (All Month)`,
      value: mVal,
      satDateStr: '',
      sunDateStr: '',
    });
  }

  const curr = new Date(today);
  while (curr <= endDate) {
    if (curr.getDay() === 6) {
      const sat = new Date(curr);
      const sun = new Date(curr);
      sun.setDate(sat.getDate() + 1);

      const satMonth = sat.toLocaleString('en-US', { month: 'short' });
      const sunMonth = sun.toLocaleString('en-US', { month: 'short' });
      const satDay = String(sat.getDate()).padStart(2, '0');
      const sunDay = String(sun.getDate()).padStart(2, '0');

      let label = '';
      if (satMonth === sunMonth) {
        label = `${satMonth} ${satDay}, ${sunDay} (Sat, Sun)`;
      } else {
        label = `${satMonth} ${satDay}, ${sunMonth} ${sunDay} (Sat, Sun)`;
      }

      const satISO = sat.toISOString().split('T')[0];
      const sunISO = sun.toISOString().split('T')[0];

      options.push({
        label,
        value: label,
        satDateStr: satISO,
        sunDateStr: sunISO,
      });

      curr.setDate(curr.getDate() + 7);
    } else {
      curr.setDate(curr.getDate() + 1);
    }
  }

  return options;
}

export function generateMonthOptions(monthsCount = 6) {
  const options: { label: string; value: string }[] = [];
  const today = new Date();
  for (let i = 0; i < monthsCount; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const value = d.toLocaleString('en-US', { month: 'short' }).toLowerCase();
    options.push({ label, value });
  }
  return options;
}

export function downloadSampleExcelTemplate(): void {
  const link = document.createElement('a');
  link.href = '/Travel_CRM_Lead_Import_Template_Vattavada_Camp_1_Payments.xlsx';
  link.setAttribute('download', 'Travel_CRM_Lead_Import_Template_Vattavada_Camp_1_Payments.xlsx');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadSampleCSVTemplate(): void {
  const content = `Name,Phone,Email,City,Lead Status,Booking Stage,Preferred Location,Preferred Date,Product / Batch,Lead Source,Assigned To,Call Notes,Next Followup Date
Ananya Sharma,+919876543210,ananya.s@gmail.com,Delhi,Hot,Advance Paid,Vattavada,"Oct 17, 18 (Sat, Sun)",Vattavada Camp & Offroad Trek Batch #1,Instagram,Rahul S,Paid ₹2000 advance payment. Sent WhatsApp confirmation itinerary.,2026-10-15
Faisal K,+919447123456,faisal.k@gmail.com,Kochi,Warm,Follow Up Required,Meghalaya,Any Future Trip,Meghalaya Living Root Bridges Batch,WhatsApp Auto,Anjali M,Interested in November dates. Wants customized budget plan for 2 pax.,2026-10-18
Rohan Mehta,+919812345678,rohan.m@yahoo.com,Mumbai,New / Unassessed,Not Contacted,Spiti Valley,15 Nov 2026,Spiti Autumn Circuit Batch #1,Website,Unassigned,New website inquiry. Sent automated welcome message.,2026-10-12
Sneha V,+919745987654,sneha.v@gmail.com,Kottayam,Hot,Ready to Book,Vattavada,"Oct 24, 25 (Sat, Sun)",Vattavada Camp & Offroad Trek Batch #1,Referral,Rahul S,Group of 4 friends ready to book. Asked for ₹500 group discount.,2026-10-14
Kiran Das,+919895112233,kiran.d@gmail.com,Trivandrum,Not Interested,Lost / Closed,Wayanad,Any Future Trip,Wayanad Plantation Retreat Batch,Facebook,Unassigned,Trip postponed indefinitely due to personal emergency.,`;

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'leads_import_full_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    results.push(row);
  }

  return results;
}
