import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card, Button, Spinner, Alert } from '../../components/ui';
import { downloadPayslipPDF } from '../../utils/payslipPdf';
import { Receipt, Download, FileText, CheckCircle2 } from 'lucide-react';

export default function EmployeePayroll() {
  const [payslips, setPayslips] = useState([]);
  const [salaryStructure, setSalaryStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        setLoading(true);
        const [slipsRes, profileRes] = await Promise.all([
          api.get('/payroll/me/payslips'),
          api.get('/auth/me'),
        ]);
        setPayslips(slipsRes.data.payslips || []);
        setSalaryStructure(profileRes.data.profile?.salary || null);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to load payslips');
      } finally {
        setLoading(false);
      }
    };
    fetchPayroll();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">My Salary & Verified Payslips</h2>
          <p className="text-xs text-slate-500">View official monthly salary statements and download vector PDF payslips</p>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {/* Current Salary Structure Card */}
      {salaryStructure && (
        <Card className="p-6 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <div>
              <span className="text-xs uppercase font-bold text-indigo-300 tracking-wider">Salary Structure</span>
              <h3 className="text-lg font-bold">Standard Compensation Package</h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Total Monthly Gross</span>
              <div className="text-2xl font-extrabold font-mono text-emerald-400">
                {salaryStructure.currency} {Number(salaryStructure.gross || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-slate-400 font-medium">Basic Pay</div>
              <div className="text-sm font-bold font-mono mt-1">
                {salaryStructure.currency} {Number(salaryStructure.basic || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-slate-400 font-medium">HRA (40%)</div>
              <div className="text-sm font-bold font-mono mt-1">
                {salaryStructure.currency} {Number(salaryStructure.hra || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-slate-400 font-medium">Medical (10%)</div>
              <div className="text-sm font-bold font-mono mt-1">
                {salaryStructure.currency} {Number(salaryStructure.medical || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <div className="text-slate-400 font-medium">Other Allowances</div>
              <div className="text-sm font-bold font-mono mt-1">
                {salaryStructure.currency} {Number(salaryStructure.allowances || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Available Payslips List */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 text-sm">Disbursed Monthly Payslips</h3>

        {payslips.length === 0 ? (
          <Card className="py-12 text-center text-slate-400 text-sm">
            <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            No finalized payslips available yet. Once HR drafts and Admin locks the payroll run, your payslips will appear here.
          </Card>
        ) : (
          payslips.map(({ month, finalizedAt, payslip }) => (
            <Card key={month} className="p-5 border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-slate-900 font-mono">
                      Pay Period: {month}
                    </span>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                      Finalized
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Gross: {payslip.currency} {payslip.salaryStructure?.gross?.toLocaleString()} · Deductions: {payslip.currency} {payslip.deductions?.totalDeductions?.toLocaleString()} · Tax: {payslip.currency} {payslip.tax?.monthlyTax?.toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Net Salary</span>
                    <div className="text-xl font-extrabold text-emerald-700 font-mono">
                      {payslip.currency} {payslip.netPay?.toLocaleString()}
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => downloadPayslipPDF({ ...payslip, month })}
                    className="flex items-center gap-1.5 text-xs py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
