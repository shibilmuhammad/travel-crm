'use client';

import { useState } from 'react';
import { ArrowLeft, Download, Upload, AlertTriangle, Loader2, CheckCircle2, FileSpreadsheet, Trash2, ArrowRight, RefreshCw, Phone, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { downloadSampleCSVTemplate, downloadSampleExcelTemplate, parseCSV, parseToISODate, normalizePhoneNumber } from '@/lib/utils';
import type { TripBatch, BookingStage, LeadSource, LeadTemperature } from '@/types';
import { read, utils as xlsxUtils } from 'xlsx';

export interface DuplicateLeadInfo {
  rowNumber: number;
  uploadedName: string;
  phone: string;
  existingName: string;
  destination: string;
  bookingStage: string;
  advanceAmount: number | null;
  assignedTo: string;
}

interface ImportLeadsViewProps {
  onClose: () => void;
  onSuccess: () => void;
  batches: TripBatch[];
}

function formatStageLabel(stage?: string) {
  if (!stage) return 'Not Contacted';
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStageBadgeClass(stage?: string) {
  const s = (stage || '').toLowerCase();
  if (s.includes('advance') || s.includes('confirmed')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s.includes('ready')) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (s.includes('follow')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s.includes('contacted')) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (s.includes('lost') || s.includes('closed')) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
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
  const [cleanReimport, setCleanReimport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number; duplicates: number; skipped: number } | null>(null);
  const [duplicateLeads, setDuplicateLeads] = useState<DuplicateLeadInfo[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportResult(null);
      setDuplicateLeads([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select an Excel or CSV file to upload.');
      return;
    }

    setLoading(true);
    setImportResult(null);
    setDuplicateLeads([]);

    try {
      if (cleanReimport) {
        await fetch('/api/leads/delete-all', { method: 'DELETE' });
      }

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

      const preparedRows = rows.map((row, idx) => {
        const rowNumber = idx + 2;

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
        const nextFollowup = String(
          row['Next Followup Date'] ||
          row['Next Follow-up Date'] ||
          row['Next Follow Up Date'] ||
          row['Next Follow-up'] ||
          row['Next Follow Up'] ||
          row['next_followup_date'] ||
          row['Followup Date'] ||
          row['Follow-up Date'] ||
          row['followup_date'] ||
          ''
        );
        const advanceStr = String(row['Advance Amount'] || row['Advance Paid'] || row['Amount Paid'] || row['advance_amount'] || '');
        const paymentDateStr = String(row['Payment Date'] || row['Advance Date'] || row['payment_date'] || '');

        const normalizedPhone = normalizePhoneNumber(phone);
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

        let finalAssigned = assignedTo && assignedTo.toLowerCase() !== 'unassigned' ? assignedTo : 'Shibil Muhammad';
        if (finalAssigned.toLowerCase() === 'shibil') {
          finalAssigned = 'Shibil Muhammad';
        }

        return {
          rowNumber,
          full_name: finalName,
          whatsapp_number: normalizedPhone,
          phone: normalizedPhone,
          email: email || null,
          departure_city: city || null,
          preferred_destination: finalDestination,
          batch_id: matchedBatch?.id || batches[0]?.id || '',
          preferred_travel_date: preferredDate || '',
          date_flexibility: finalDateFlexibility,
          lead_source: parseLeadSource(leadSourceStr),
          assigned_team_member: finalAssigned,
          lead_temperature: parsedTemp,
          interest_level: parsedTemp,
          booking_stage: parseBookingStage(bookingStageStr),
          advance_amount: parsedAdvance,
          payment_date: parsedPaymentDate || null,
          notes: callNotes || null,
          next_followup_date: parsedNextFollowup || null,
          next_followup_time: parsedNextFollowup ? '10:00 AM' : null,
          next_followup_status: parsedNextFollowup ? 'pending' : null,
        };
      });

      const res = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clean_reimport: cleanReimport,
          leads: preparedRows,
        }),
      });

      if (!res.ok) {
        throw new Error('Bulk import failed on server');
      }

      const resData = await res.json();
      setDuplicateLeads(resData.duplicateLeads || []);
      setImportResult({
        count: resData.count || 0,
        duplicates: resData.duplicates || 0,
        skipped: resData.skipped || 0,
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Error parsing or uploading file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllLeads = async () => {
    if (!confirm('⚠️ Are you sure you want to delete ALL leads in the database? This will allow a 100% clean re-import of your Excel file.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/leads/delete-all', { method: 'DELETE' });
      if (res.ok) {
        setImportResult(null);
        setDuplicateLeads([]);
        alert('All existing leads deleted successfully! The database is now clean (0 leads). You can now upload your Excel sheet.');
        onSuccess();
      } else {
        alert('Failed to delete leads.');
      }
    } catch (e: any) {
      alert('Error clearing leads: ' + e.message);
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

        <Button
          onClick={handleDeleteAllLeads}
          variant="outline"
          size="sm"
          disabled={loading}
          className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold gap-1.5 bg-white shadow-2xs cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear / Delete All Leads
        </Button>
      </div>

      <div className="max-w-5xl">
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
                className="text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border border-slate-300 file:bg-slate-50 file:text-slate-700 file:font-semibold hover:file:bg-slate-100 cursor-pointer"
              />
            </div>

            {/* Clean Re-import option */}
            <div>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-amber-50/80 hover:bg-amber-100/70 px-3 py-2 rounded-xl border border-amber-200 transition-colors">
                <input
                  type="checkbox"
                  checked={cleanReimport}
                  onChange={(e) => setCleanReimport(e.target.checked)}
                  className="rounded border-amber-400 text-blue-900 focus:ring-blue-900 w-4 h-4 cursor-pointer"
                />
                <span>
                  <strong>Clean Re-import:</strong> Clear all existing leads before importing (prevents duplicate matching)
                </span>
              </label>
            </div>

            <Button
              onClick={handleUpload}
              disabled={loading || !file}
              className="bg-[#0e2a56] hover:bg-[#0a1f42] text-white font-semibold text-xs px-6 py-2.5 shadow gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {loading ? 'Processing & Importing Rows...' : 'Upload & Import Leads'}
            </Button>
          </div>

          {/* Detailed Import Results & Actual Duplicates Found Table */}
          {importResult && (
            <div className="space-y-5 pt-6 border-t border-slate-200">
              {/* Re-import Information Banner */}
              {importResult.count === 0 && importResult.duplicates > 0 && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-blue-900">
                      All {importResult.duplicates} contacts from this sheet are already in your CRM!
                    </div>
                    <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                      Your database already contains these contacts. Their records were synchronized and refreshed with the latest data from this file. Click <strong>"View All Leads in CRM"</strong> below to view them in your leads table. (To completely reset and wipe before re-importing, check the <strong>Clean Re-import</strong> box above).
                    </p>
                  </div>
                </div>
              )}

              {/* Summary Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`p-4 rounded-xl border shadow-2xs ${importResult.count > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${importResult.count > 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${importResult.count > 0 ? 'text-emerald-800' : 'text-slate-600'}`}>
                      New Leads Added
                    </span>
                  </div>
                  <div className={`text-2xl font-black mt-1 ${importResult.count > 0 ? 'text-emerald-950' : 'text-slate-800'}`}>
                    {importResult.count}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${importResult.count > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {importResult.count > 0 ? 'Added as fresh entries' : 'All contacts already exist in CRM'}
                  </p>
                </div>

                <div className={`p-4 rounded-xl border shadow-2xs ${importResult.duplicates > 0 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <UserCheck className={`w-4 h-4 ${importResult.duplicates > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${importResult.duplicates > 0 ? 'text-blue-900' : 'text-slate-600'}`}>
                      Existing Contacts Synced
                    </span>
                  </div>
                  <div className={`text-2xl font-black mt-1 ${importResult.duplicates > 0 ? 'text-blue-950' : 'text-slate-800'}`}>
                    {importResult.duplicates}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${importResult.duplicates > 0 ? 'text-blue-800' : 'text-slate-500'}`}>
                    Matched & updated in CRM
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Skipped Records</div>
                  <div className="text-2xl font-black text-slate-700 mt-1">{importResult.skipped}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Missing phone numbers</p>
                </div>
              </div>

              {/* Duplicate Leads Detail Table */}
              {duplicateLeads.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 font-bold">
                        i
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Matched Existing Contacts in CRM ({duplicateLeads.length})
                        </h3>
                        <p className="text-[11px] text-slate-600">
                          These contacts match existing records in your CRM database and were synced to prevent double entries:
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-900 bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200">
                      {duplicateLeads.length} Synced {duplicateLeads.length === 1 ? 'Contact' : 'Contacts'}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                          <th className="py-2.5 px-3 w-14 text-center">Row #</th>
                          <th className="py-2.5 px-3">Uploaded Name</th>
                          <th className="py-2.5 px-3">WhatsApp Number</th>
                          <th className="py-2.5 px-3">Existing CRM Lead</th>
                          <th className="py-2.5 px-3">Destination / Batch</th>
                          <th className="py-2.5 px-3">Booking Stage</th>
                          <th className="py-2.5 px-3">Advance Paid</th>
                          <th className="py-2.5 px-3">Assigned Staff</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {duplicateLeads.map((dup, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                              #{dup.rowNumber}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {dup.uploadedName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px]">
                              {dup.phone}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1.5 text-slate-800 font-medium">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                {dup.existingName}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                              {dup.destination || '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${getStageBadgeClass(dup.bookingStage)}`}>
                                {formatStageLabel(dup.bookingStage)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {dup.advanceAmount ? `₹${Number(dup.advanceAmount).toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                              {dup.assignedTo || 'Shibil Muhammad'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  onClick={() => {
                    setFile(null);
                    setImportResult(null);
                    setDuplicateLeads([]);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold text-slate-600 border-slate-300 hover:bg-slate-50 gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Upload Another File
                </Button>

                <Button
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 shadow-sm gap-2 cursor-pointer"
                >
                  View All Leads in CRM <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


