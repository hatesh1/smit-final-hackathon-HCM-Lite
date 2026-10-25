import { jsPDF } from 'jspdf';

export function downloadPayslipPDF(payslip, companyName = 'HCM Lite') {
  if (!payslip) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currency = payslip.currency || 'PKR';

  // Header Background Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 38, 'F');

  // Company Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text('OFFICIAL MONTHLY SALARY STATEMENT & PAYSLIP', 14, 26);
  doc.text(`PAY PERIOD: ${payslip.month || 'Current Month'}`, 140, 26);

  // Employee Information Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 44, 182, 32, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Name:', 20, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(payslip.name || 'N/A', 56, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('Employee ID:', 20, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(payslip.employeeId || 'N/A', 56, 60);

  doc.setFont('helvetica', 'bold');
  doc.text('Department:', 20, 68);
  doc.setFont('helvetica', 'normal');
  doc.text(payslip.department || 'N/A', 56, 68);

  doc.setFont('helvetica', 'bold');
  doc.text('Designation:', 110, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(payslip.designation || 'N/A', 140, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('Working Days:', 110, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`${payslip.workingDaysInMonth || 22} Days`, 140, 60);

  doc.setFont('helvetica', 'bold');
  doc.text('Payment Status:', 110, 68);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text((payslip.paymentStatus || 'Processed').toUpperCase(), 140, 68);

  // Earnings & Deductions Tables
  let startY = 84;

  // Headers
  doc.setFillColor(79, 70, 229); // Indigo-600
  doc.rect(14, startY, 88, 8, 'F');
  doc.setFillColor(225, 29, 72); // Rose-600
  doc.rect(108, startY, 88, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EARNINGS & ALLOWANCES', 18, startY + 5.5);
  doc.text('AMOUNT', 80, startY + 5.5);

  doc.text('DEDUCTIONS & TAXES', 112, startY + 5.5);
  doc.text('AMOUNT', 174, startY + 5.5);

  // Rows
  const earnings = [
    { label: 'Basic Salary', val: payslip.salaryStructure?.basic || 0 },
    { label: 'House Rent Allowance (HRA 40%)', val: payslip.salaryStructure?.hra || 0 },
    { label: 'Medical Allowance (10%)', val: payslip.salaryStructure?.medical || 0 },
    { label: 'Other Special Allowances', val: payslip.salaryStructure?.allowances || 0 },
  ];

  const deductions = [
    { label: `Absence Deductions (${payslip.attendanceStats?.absentDays || 0} days)`, val: payslip.deductions?.absentDeduction || 0 },
    { label: `Unpaid Leave (${payslip.attendanceStats?.unpaidLeaveDays || 0} days)`, val: payslip.deductions?.unpaidLeaveDeduction || 0 },
    { label: `Half-Day Deductions (${payslip.attendanceStats?.halfDays || 0} days)`, val: payslip.deductions?.halfDayDeduction || 0 },
    { label: `Late Penalties (${payslip.attendanceStats?.lateDays || 0} lates)`, val: payslip.deductions?.latePenaltyDeduction || 0 },
    { label: 'Income Tax (Annualized Slab / 12)', val: payslip.tax?.monthlyTax || 0 },
  ];

  const maxRows = Math.max(earnings.length, deductions.length);
  let curY = startY + 14;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  for (let i = 0; i < maxRows; i++) {
    doc.setTextColor(51, 65, 85);

    // Earning column
    if (earnings[i]) {
      doc.text(earnings[i].label, 16, curY);
      doc.text(`${currency} ${Number(earnings[i].val).toLocaleString()}`, 74, curY);
    }

    // Deduction column
    if (deductions[i]) {
      doc.text(deductions[i].label, 110, curY);
      doc.text(`${currency} ${Number(deductions[i].val).toLocaleString()}`, 168, curY);
    }

    // Row divider line
    doc.setDrawColor(241, 245, 249);
    doc.line(14, curY + 2, 196, curY + 2);

    curY += 8;
  }

  // Totals Row
  curY += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, curY, 88, 8, 'F');
  doc.rect(108, curY, 88, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Total Gross Earnings:', 16, curY + 5.5);
  doc.text(`${currency} ${(payslip.salaryStructure?.gross || 0).toLocaleString()}`, 70, curY + 5.5);

  const totalAllDeductions = (payslip.deductions?.totalDeductions || 0) + (payslip.tax?.monthlyTax || 0);
  doc.text('Total Deductions:', 110, curY + 5.5);
  doc.text(`${currency} ${totalAllDeductions.toLocaleString()}`, 164, curY + 5.5);

  // Net Pay Box
  curY += 16;
  doc.setFillColor(238, 242, 255); // Indigo-50
  doc.setDrawColor(99, 102, 241); // Indigo-500
  doc.roundedRect(14, curY, 182, 20, 2, 2, 'FD');

  doc.setTextColor(67, 56, 202); // Indigo-700
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET SALARY PAYABLE:', 22, curY + 12);

  doc.setFontSize(15);
  doc.text(`${currency} ${(payslip.netPay || 0).toLocaleString()}`, 120, curY + 12);

  // Footer / Signatures
  const footerY = 240;
  doc.setDrawColor(203, 213, 225);
  doc.line(20, footerY, 70, footerY);
  doc.line(130, footerY, 180, footerY);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Prepared by HR Operations', 25, footerY + 5);
  doc.text('Approved by Authorized Signatory', 132, footerY + 5);

  doc.text('This is a system generated payslip. No physical stamp required.', 35, 275);

  // Trigger download
  doc.save(`Payslip_${payslip.employeeId || 'EMP'}_${payslip.month || 'current'}.pdf`);
}
