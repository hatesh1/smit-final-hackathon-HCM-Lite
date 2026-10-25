import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Card, Button, Input, Field, Alert, Spinner } from '../../components/ui';
import StatusBadge from '../../components/StatusBadge';
import { downloadPayslipPDF } from '../../utils/payslipPdf';
import {
  Receipt,
  Lock,
  Download,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  X,
} from 'lucide-react';

export default function AdminPayroll() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isHR = user?.role === 'hr';

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [runs, setRuns] = useState([]);
  const [currentRun, setCurrentRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Payslip Modal
  const [selectedSlip, setSelectedSlip] = useState(null);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/payroll/runs');
      setRuns(data.runs || []);

      // Fetch details of selected month
      try {
        const { data: runData } = await api.get(`/payroll/runs/${selectedMonth}`);
        setCurrentRun(runData.run || null);
      } catch (err) {
        setCurrentRun(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load payroll records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [selectedMonth]);

  // HR generates or reviews monthly payroll draft
  const handleGenerateDraft = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await api.post('/payroll/generate', { month: selectedMonth });
      setCurrentRun(data.run);
      setSuccess(`Payroll draft for ${selectedMonth} generated successfully! Ready for review.`);
      fetchRuns();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate payroll run');
    } finally {
      setGenerating(false);
    }
  };

  // Admin finalizes and locks the month (Feature 16)
  const handleFinalizePayroll = async () => {
    if (!window.confirm(`Finalize and lock payroll for ${selectedMonth}? Once locked, no edits can be made, and payslips will be released to employees.`)) {
      return;
    }

    setFinalizing(true);
    setError(null);
    setSuccess(null);
    try {
      const { data } = await api.post('/payroll/finalize', { month: selectedMonth });
      setCurrentRun(data.run);
      setSuccess(`Payroll for ${selectedMonth} has been finalized and locked! Payslips released.`);
      fetchRuns();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to finalize payroll');
    } finally {
      setFinalizing(false);
    }
  };

  const isFinalized = currentRun?.status === 'finalized';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Monthly Payroll & Payslips</h2>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Admin Authority: Review monthly salary disbursements and Finalize/Lock monthly run'
              : 'HR Authority: Configure salary structures, compute attendance deductions, and prepare draft'}
          </p>
        </div>

        {/* Month Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent outline-none text-slate-700"
            />
          </div>

          {/* HR Generate Draft Button */}
          {isHR && !isFinalized && (
            <Button
              variant="secondary"
              onClick={handleGenerateDraft}
              disabled={generating}
              className="text-xs py-2 px-3 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50/50"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Calculating...' : currentRun ? 'Recalculate Draft' : 'Generate Draft'}</span>
            </Button>
          )}

          {/* Admin Finalize & Lock Button (Feature 16) */}
          {isAdmin && currentRun && !isFinalized && (
            <Button
              variant="primary"
              onClick={handleFinalizePayroll}
              disabled={finalizing}
              className="text-xs py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{finalizing ? 'Locking...' : 'Finalize & Lock Month'}</span>
            </Button>
          )}

          {isFinalized && (
            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 text-xs font-bold">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Finalized & Locked</span>
            </span>
          )}
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {/* Summary Metrics for selected run */}
      {currentRun && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4 border-l-4 border-l-indigo-600">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Gross Salary</div>
            <div className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              {currentRun.currency} {Number(currentRun.totalGross || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">1.5 × Basic across {currentRun.totalEmployees} staff</div>
          </Card>

          <Card className="p-4 border-l-4 border-l-rose-600">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attendance Deductions</div>
            <div className="mt-2 text-xl sm:text-2xl font-extrabold text-rose-600 font-mono">
              {currentRun.currency} {Number(currentRun.totalDeductions || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Absent + unpaid + 0.5×half-day</div>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-600">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Income Tax</div>
            <div className="mt-2 text-xl sm:text-2xl font-extrabold text-amber-600 font-mono">
              {currentRun.currency} {Number(currentRun.totalTax || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Annualized tax brackets ÷ 12</div>
          </Card>

          <Card className="p-4 border-l-4 border-l-emerald-600">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Net Payable</div>
            <div className="mt-2 text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono">
              {currentRun.currency} {Number(currentRun.totalNetPay || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Disbursement total</div>
          </Card>
        </div>
      )}

      {/* Payslips Table */}
      <Card className="overflow-hidden p-0 border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Employee Salary Ledger — {selectedMonth}
          </h3>
          <StatusBadge status={currentRun ? currentRun.status : 'draft'} />
        </div>

        {!currentRun ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No payroll run generated for {selectedMonth} yet.</p>
            {isHR && (
              <Button
                variant="primary"
                onClick={handleGenerateDraft}
                disabled={generating}
                className="mt-4 text-xs py-2 px-4 bg-indigo-600"
              >
                Generate Draft Now
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Gross Salary</th>
                  <th className="py-3 px-4">Working Days</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Tax (Monthly)</th>
                  <th className="py-3 px-4">Net Salary</th>
                  <th className="py-3 px-4 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentRun.payslips?.map((slip) => (
                  <tr key={slip._id || slip.user} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{slip.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{slip.employeeId}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{slip.department}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {slip.currency} {slip.salaryStructure?.gross?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {slip.workingDaysInMonth} days
                    </td>
                    <td className="py-3 px-4 font-mono text-rose-600">
                      - {slip.currency} {slip.deductions?.totalDeductions?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-600">
                      - {slip.currency} {slip.tax?.monthlyTax?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-extrabold text-emerald-700">
                      {slip.currency} {slip.netPay?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSlip({ ...slip, month: selectedMonth })}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          title="View Breakdown"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => downloadPayslipPDF({ ...slip, month: selectedMonth })}
                          className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50"
                          title="Download PDF Payslip"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Payslip View Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Official Payslip Statement</h3>
                <div className="text-xs text-slate-500 font-mono">
                  {selectedSlip.employeeId} · {selectedSlip.name} · {selectedSlip.month}
                </div>
              </div>
              <button onClick={() => setSelectedSlip(null)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Earnings</div>
                <div className="flex justify-between">
                  <span>Basic Salary:</span>
                  <span className="font-mono font-semibold">{selectedSlip.currency} {selectedSlip.salaryStructure?.basic?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>HRA (40%):</span>
                  <span className="font-mono font-semibold">{selectedSlip.currency} {selectedSlip.salaryStructure?.hra?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medical (10%):</span>
                  <span className="font-mono font-semibold">{selectedSlip.currency} {selectedSlip.salaryStructure?.medical?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                  <span>Total Gross:</span>
                  <span className="font-mono">{selectedSlip.currency} {selectedSlip.salaryStructure?.gross?.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Deductions & Taxes</div>
                <div className="flex justify-between">
                  <span>Absent Deductions:</span>
                  <span className="font-mono text-rose-600">- {selectedSlip.currency} {selectedSlip.deductions?.absentDeduction?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Half-Day Deductions:</span>
                  <span className="font-mono text-rose-600">- {selectedSlip.currency} {selectedSlip.deductions?.halfDayDeduction?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Income Tax (Monthly):</span>
                  <span className="font-mono text-amber-600">- {selectedSlip.currency} {selectedSlip.tax?.monthlyTax?.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-xl bg-indigo-50/80 p-4 border border-indigo-200 flex justify-between items-center text-indigo-900 font-extrabold text-sm">
                <span>Net Salary Payable:</span>
                <span className="text-lg font-mono">{selectedSlip.currency} {selectedSlip.netPay?.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setSelectedSlip(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => downloadPayslipPDF(selectedSlip)}
                className="flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                <span>Download PDF Payslip</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
