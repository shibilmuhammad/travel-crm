'use client';

import { useState } from 'react';
import { ArrowLeft, Download, Upload, AlertTriangle, Loader2, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadSampleCSVTemplate, downloadSampleExcelTemplate, parseCSV, parseToISODate, normalizePhoneNumber } from '@/lib/utils';
import type { TripBatch, BookingStage, LeadSource, LeadTemperature } from '@/types';
import { read, utils as xlsxUtils } from 'xlsx';

interface ImportLeadsViewProps {
  onClose: () => void;
  onSuccess: () => void;
  batches: TripBatch[];
}

function parseLeadTemperature(val: string): LeadTemperature {
  const v = val.toLowerCase().trim();
  if (v.includes('hot')) return 'hot';
  if (v.includes('warm')) return 'warm';
  if (v.includes('cold')) return 'cold';
  if (v.includes('not interested') || v.includes('not_interested') || v.includes('lost') || v.includes('closed')) return 'not_interested';
  return 'new';
}

function parseBookingStage(val: string): BookingStage {
  const v = val.toLowerCase().trim();
  if (v.includes('not contacted') || v.includes('not_contacted') || v === 'uncontacted') return 'not_contacted';
  if (v.includes('advance paid') || v.includes('advance')) return 'advance_paid';
  if (v.includes('booking confirmed') || v.includes('confirmed')) return 'booking_confirmed';
  if (v.includes('ready to book') || v.includes('ready')) return 'ready_to_book';
  if (v.includes('waiting for price') || v.includes('price')) return 'waiting_for_price';
  if (v.includes('waiting for date') || v.includes('date')) return 'waiting_for_date';
  if (v.includes('follow up') || v.includes('followup') || v.includes('follow_up')) return 'follow_up_required';
  if (v.includes('contacted')) return 'contacted';
  if (v.includes('lost') || v.includes('closed')) return 'lost_closed';
  return 'not_contacted';
}

function parseLeadSource(val: string): LeadSource {
  const v = val.toLowerCase().trim();
  if (v.includes('insta')) return 'instagram';
  if (v.includes('wa') || v.includes('whatsapp')) return 'whatsapp';
  if (v.includes('fb') || v.includes('facebook')) return 'facebook';
  if (v.includes('google')) return 'google_ads';
  if (v.includes('ref')) return 'referral';
  if (v.includes('walk')) return 'walk_in';
  if (v.includes('web')) return 'website';
  return 'manual_entry';
}

export function ImportLeadsView({ onClose, onSuccess, batches }: ImportLeadsViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number; duplicates: number; skipped: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select an Excel or CSV file to upload.');
      return;
    }

    setLoading(true);
    try {
      let rows: Record<string, any>[] = [];

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = xlsxUtils.sheet_to_json<Record<string, any>>(worksheet, { raw: false, defval: '' });
      } else {
        const text = await file.text();
        rows = parseCSV(text);
      }

      if (!rows || rows.length === 0) {
        alert('No valid lead rows found in the file.');
        setLoading(false);
        return;
      }

      let importedCount = 0;
      let duplicateCount = 0;
      let skippedCount = 0;

      for (const row of rows) {
        const name = String(row['Name'] || row['name'] || row['Full Name'] || '');
        const phone = String(row['Phone'] || row['phone'] || row['WhatsApp'] || row['whatsapp'] || '');
        const email = String(row['Email'] || row['email'] || '');
        const city = String(row['City'] || row['city'] || row['Location'] || '');
        const leadStatus = String(row['Lead Status'] || row['lead_status'] || row['Status'] || row['status'] || '');
        const bookingStageStr = String(row['Booking Stage'] || row['booking_stage'] || row['Stage'] || '');
        const preferredLoc = String(row['Preferred Location'] || row['preferred_location'] || row['Location'] || '');
        const preferredDate = String(row['Preferred Date'] || row['Prefered date'] || row['preferred_date'] || '');
        const products = String(row['Product / Batch'] || row['Products'] || row['products'] || row['Batch'] || '');
        const leadSourceStr = String(row['Lead Source'] || row['lead_source'] || row['Source'] || '');
        const assignedTo = String(row['Assigned To'] || row['assigned_to'] || row['Assigned'] || '');
        const callNotes = String(row['Call Notes'] || row['notes'] || row['Notes'] || '');
        const nextFollowup = String(row['Next Followup Date'] || row['next_followup_date'] || row['Followup Date'] || '');
        const advanceStr = String(row['Advance Amount'] || row['Advance Paid'] || row['Amount Paid'] || row['advance_amount'] || '');
        const paymentDateStr = String(row['Payment Date'] || row['Advance Date'] || row['payment_date'] || '');

        const normalizedPhone = normalizePhoneNumber(phone);
        if (!normalizedPhone || normalizedPhone === '—') {
          skippedCount++;
          continue;
        }

        const finalName = name.trim() || normalizedPhone;

        const matchedBatch = batches.find((b) => {
          if (!products && !preferredLoc) return false;
          const p = products.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
          const loc = preferredLoc.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
          const bTitle = (b.title || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
          const bDest = (b.destination || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

          if (p && (bTitle.includes(p) || p.includes(bTitle) || bDest.includes(p) || p.includes(bDest))) return true;

          const pWords = p.split(/\s+/).filter((w) => w.length > 0);
          if (pWords.length > 0) {
            const isWordMatch = pWords.every((w) => bTitle.includes(w) || bDest.includes(w));
            if (isWordMatch) return true;
          }

          if (loc && (bTitle.includes(loc) || loc.includes(bTitle) || bDest.includes(loc) || loc.includes(bDest))) return true;

          return false;
        });

        const finalDestination = preferredLoc || matchedBatch?.destination || products || 'Vattavada';
        const finalDateFlexibility = preferredDate.toLowerCase().includes('any future')
          ? 'any_future_batch'
          : preferredDate
          ? 'specific_date_only'
          : 'not_decided';

        const parsedTemp = parseLeadTemperature(leadStatus);
        const parsedAdvance = advanceStr ? parseFloat(advanceStr.replace(/[^0-9.]/g, '')) : null;
        const parsedPaymentDate = parseToISODate(paymentDateStr);
        const parsedNextFollowup = parseToISODate(nextFollowup);

        const payload = {
          full_name: finalName,
          whatsapp_number: normalizedPhone,
          email: email || null,
          departure_city: city || null,
          preferred_destination: finalDestination,
          batch_id: matchedBatch?.id || batches[0]?.id || '',
          preferred_travel_date: preferredDate || '',
          date_flexibility: finalDateFlexibility,
          lead_source: parseLeadSource(leadSourceStr),
          assigned_team_member: assignedTo || 'Unassigned',
          lead_temperature: parsedTemp,
          interest_level: parsedTemp,
          booking_stage: parseBookingStage(bookingStageStr),
          advance_amount: parsedAdvance,
          payment_date: parsedPaymentDate || null,
          notes: callNotes || null,
          next_followup_date: parsedNextFollowup || null,
        };

        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const resData = await res.json();
          if (resData.isDuplicate) {
            duplicateCount++;
          } else {
            importedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      setImportResult({ count: importedCount, duplicates: duplicateCount, skipped: skippedCount });
      alert(`🎉 Import Complete!\n• ${importedCount} new leads created.\n• ${duplicateCount} duplicate contacts updated.\n${skippedCount > 0 ? `• ${skippedCount} skipped.` : ''}`);
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Error parsing or uploading file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching Reference Image 2 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" /> Back to Leads
        </button>
      </div>

      <div className="max-w-3xl">
        <Card className="bg-white border-slate-200 shadow-xs p-8 rounded-2xl space-y-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Import Bulk Leads (Excel / CSV)</h1>
            <p className="text-xs text-slate-500 mt-1">
              Upload your bulk contacts from Excel or CSV with lead status, booking stages, preferred location/date, call notes, and followups.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={downloadSampleExcelTemplate}
              variant="outline"
              size="sm"
              className="bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 text-xs font-semibold gap-2 shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Download Vattavada Camp 1 Payments Template (.XLSX)
            </Button>

            <Button
              onClick={downloadSampleCSVTemplate}
              variant="outline"
              size="sm"
              className="border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-semibold gap-2 shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" /> Download Sample CSV (.CSV)
            </Button>
          </div>

          {/* Excel formatting warning box matching Reference Image 2 */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Before you save the file in Excel
            </div>
            <p className="text-amber-800 text-[11px] leading-relaxed pl-5">
              Select the <strong>Phone</strong> column → <strong>Format Cells → Text</strong>. Left as a number, Excel shortens <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">919876543210</code> to <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">9.17E+11</code> when it saves, and the real number cannot be recovered afterwards. Rows without a phone number are skipped automatically.
            </p>
          </div>

          {/* Expected Columns & Dropdown Values Box */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div>
              <span className="font-bold text-slate-900">Supported Columns:</span>
              <div className="font-mono text-slate-700 bg-white p-2.5 rounded border border-slate-200 mt-1 text-[11px] leading-relaxed overflow-x-auto">
                Name, Phone, Email, City, Lead Status, Booking Stage, Preferred Location, Preferred Date, Product / Batch, Lead Source, Assigned To, Call Notes, Next Followup Date
              </div>
            </div>

            <div className="space-y-2 text-slate-600 text-[11px]">
              <p className="font-bold text-slate-800 text-xs">Accepted Dropdown Values Guide:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="font-bold text-slate-800 block">Lead Status:</span>
                  <code className="text-slate-600">New / Unassessed</code>, <code className="text-slate-600">Hot</code>, <code className="text-slate-600">Warm</code>, <code className="text-slate-600">Cold</code>, <code className="text-slate-600">Not Interested</code>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="font-bold text-slate-800 block">Booking Stage:</span>
                  <code className="text-slate-600">Not Contacted</code>, <code className="text-slate-600">Contacted</code>, <code className="text-slate-600">Follow Up Required</code>, <code className="text-slate-600">Waiting for Date</code>, <code className="text-slate-600">Waiting for Price</code>, <code className="text-slate-600">Ready to Book</code>, <code className="text-slate-600">Advance Paid</code>, <code className="text-slate-600">Booking Confirmed</code>, <code className="text-slate-600">Lost / Closed</code>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="font-bold text-slate-800 block">Preferred Date Formats:</span>
                  <span className="block">• Weekend: <code className="text-slate-600">Oct 24, 25 (Sat, Sun)</code></span>
                  <span className="block">• Flexible: <code className="text-slate-600">Any Future Trip</code></span>
                  <span className="block">• Custom: <code className="text-slate-600">24 Oct 2026</code> or <code className="text-slate-600">2026-10-24</code></span>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="font-bold text-slate-800 block">Lead Source:</span>
                  <code className="text-slate-600">Instagram</code>, <code className="text-slate-600">WhatsApp Auto</code>, <code className="text-slate-600">Website</code>, <code className="text-slate-600">Referral</code>, <code className="text-slate-600">Facebook</code>, <code className="text-slate-600">Google Ads</code>, <code className="text-slate-600">Manual Entry</code>
                </div>
              </div>
            </div>
          </div>

          {/* Excel / CSV File Input */}
          <div className="space-y-4 pt-2">
            <label className="block text-xs font-bold text-slate-700">Select File (.xlsx, .xls, .csv)</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-300 file:bg-slate-50 file:text-slate-700 file:font-semibold hover:file:bg-slate-100 cursor-pointer"
              />
            </div>

            {importResult && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Import Complete: {importResult.count} new leads created, {importResult.duplicates} duplicate contacts updated. {importResult.skipped > 0 ? `(${importResult.skipped} skipped)` : ''}
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={loading || !file}
              className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold text-xs px-6 py-2 shadow gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload & Import Leads
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}


