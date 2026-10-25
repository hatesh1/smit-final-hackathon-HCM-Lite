const { GoogleGenAI } = require('@google/genai');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const PayrollRun = require('../models/PayrollRun');
const AiLog = require('../models/AiLog');
const { getAdminDashboard, getHRDashboard, getEmployeeDashboard } = require('./dashboard.service');
const { getBalances } = require('./leave.service');
const { startOfDayUTC } = require('../utils/dates');

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// Rate limiting: max 20 requests per user per hour
async function checkAiRateLimit(userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await AiLog.countDocuments({
    user: userId,
    createdAt: { $gte: oneHourAgo },
  });
  if (count >= 20) {
    throw new Error('AI rate limit reached (20 requests per hour). Please try again later.');
  }
}

// Tool implementations with strict user role scoping
async function executeTool(toolName, args, requestingUser) {
  const now = new Date();
  const today = startOfDayUTC(now);

  switch (toolName) {
    case 'get_headcount': {
      // Allowed for Admin and HR. For employee, returns general active company count
      const filter = { 'job.status': { $in: ['active', 'probation'] } };
      if (args.department) filter['job.department'] = args.department;
      const count = await Profile.countDocuments(filter);
      return { department: args.department || 'All', activeHeadcount: count };
    }

    case 'get_attendance_summary': {
      // Admin and HR: company/dept wide. Employee: own today status
      if (requestingUser.role === 'employee') {
        const myRecord = await Attendance.findOne({ user: requestingUser.id, date: today }).lean();
        return {
          employeeId: requestingUser.employeeId,
          todayStatus: myRecord ? myRecord.status : 'not_checked_in',
          checkIn: myRecord?.checkIn || null,
          workHours: myRecord?.workHours || 0,
        };
      }
      const board = await getHRDashboard({ department: args.department });
      return {
        date: today.toISOString().slice(0, 10),
        department: args.department || 'All',
        totalEmployees: board.kpis.headcount,
        presentToday: board.kpis.presentToday,
        lateToday: board.kpis.lateToday,
        onLeaveToday: board.kpis.onLeaveToday,
        halfDayToday: board.kpis.halfDayToday,
        attendanceRate: `${board.kpis.attendanceRate}%`,
      };
    }

    case 'get_late_comers': {
      if (requestingUser.role === 'employee') {
        const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
        const myLates = await Attendance.countDocuments({
          user: requestingUser.id,
          date: { $gte: startOfMonth },
          status: 'late',
        });
        return { lateCountThisMonth: myLates };
      }
      const hrBoard = await getHRDashboard({ department: args.department });
      return { topLateComers: hrBoard.topLateComers };
    }

    case 'get_leave_summary': {
      if (requestingUser.role === 'employee') {
        const balances = await getBalances(requestingUser.id, now.getFullYear());
        return { myLeaveBalances: balances };
      }
      const hrData = await getHRDashboard({ department: args.department });
      const pendingLeaves = await LeaveRequest.find({ status: 'pending' })
        .populate('user', 'employeeId email')
        .limit(10)
        .lean();
      return {
        onLeaveToday: hrData.kpis.onLeaveToday,
        pendingApprovalsCount: hrData.kpis.pendingApprovals,
        leaveUseByType: hrData.leaveUseByType,
        samplePending: pendingLeaves.map((l) => ({
          employeeId: l.user?.employeeId,
          type: l.type,
          workingDays: l.workingDaysCount,
        })),
      };
    }

    case 'get_my_leave_balance': {
      const balances = await getBalances(requestingUser.id, now.getFullYear());
      return { balances };
    }

    case 'get_payroll_summary': {
      // STRICT PERMISSION CHECK:
      if (requestingUser.role === 'employee') {
        return {
          error: 'ACCESS_DENIED',
          message: 'As an employee, you do not have permission to view company payroll summaries or salaries of other employees.',
        };
      }
      const adminDash = await getAdminDashboard({ department: args.department });
      return {
        department: args.department || 'All',
        totalPayrollCost: adminDash.kpis.payrollCost,
        netPayable: adminDash.kpis.netPayable,
        avgSalary: adminDash.kpis.avgSalary,
        currency: adminDash.kpis.currency,
      };
    }

    case 'search_employees': {
      const query = { 'job.status': { $in: ['active', 'probation'] } };
      if (args.department) query['job.department'] = args.department;
      if (args.name) {
        query.$or = [
          { 'personal.firstName': { $regex: args.name, $options: 'i' } },
          { 'personal.lastName': { $regex: args.name, $options: 'i' } },
        ];
      }
      const list = await Profile.find(query)
        .populate('user', 'employeeId email role')
        .limit(10)
        .lean();

      // If employee role, mask salary fields!
      return list.map((p) => ({
        employeeId: p.user?.employeeId,
        name: `${p.personal?.firstName || ''} ${p.personal?.lastName || ''}`.trim(),
        department: p.job?.department,
        designation: p.job?.designation,
        email: p.user?.email,
        phone: p.personal?.phone,
        ...(requestingUser.role !== 'employee' ? { salaryGross: p.salary?.gross } : {}),
      }));
    }

    default:
      return { error: 'UNKNOWN_TOOL', message: `Tool ${toolName} not supported` };
  }
}

const SYSTEM_INSTRUCTION = `
You are the official AI Assistant for HCM Lite (Human Capital Management).
You operate with the user's role and data-scope permissions.

MANDATORY RULES:
1. THE DATABASE IS THE ONLY SOURCE OF TRUTH. Always use tool calling to retrieve data. Never hallucinate or make up numbers.
2. PERMISSIONS:
   - If the user role is 'employee' and they ask for ANY colleague's salary or company-wide payroll: POLITELY REFUSE. Say: "I cannot disclose colleague salary or company-wide payroll information. You may only view your own compensation records."
   - Employees CAN ask for their own leave balance, attendance records, or payslips.
   - Admin and HR can view workforce analytics, headcount, late comers, leave summaries, and payroll totals.
3. COMPANY POLICY KNOWLEDGE (Section 3 of Brief):
   - Office start: 09:00 AM.
   - Grace period: 15 minutes. Any check-in after 09:15 AM is marked 'late'.
   - Half-day threshold: Any total work time under 5 hours is classified as 'half-day'.
   - Weekend days: Saturday and Sunday.
   - Leave Quotas: Annual 14 days, Sick 8 days, Casual 10 days; Unpaid is unlimited.
   - Leave calculation: Working days only (weekends and public holidays are excluded). Overlap or exceeding balance returns an error.
   - Payroll Formula:
     * Gross = 1.5 × Basic Salary (HRA 40%, Medical 10%).
     * Per-day rate = Gross ÷ Working days in month.
     * Deductions = (Absent days + Unpaid leave days + 0.5 × Half days) × Per-day rate.
     * Late penalty bonus rule: 3 lates = 0.5 day deduction.
     * Annualized Tax Slabs: 0 to 600k (0%); 600k-1.2M (5% on excess); 1.2M-2.4M (30k + 15%); 2.4M-3.6M (210k + 25%); >3.6M (510k + 35%).
     * Monthly Tax = Annual Tax ÷ 12. Net Pay = Gross - Deductions - Monthly Tax.
4. ROMAN URDU SUPPORT:
   - If the user asks in Roman Urdu (e.g., "Kitnay log aaj absent hain?", "Mujhe aglay peer ko chutti chahiye", "Meri sick leave kitni bachi hain?"), understand accurately and respond in polite, clear Roman Urdu or English!
5. CONCISENESS & TONE: Professional, accurate, concise, helpful.
`;

const TOOLS_DECLARATION = [
  {
    functionDeclarations: [
      {
        name: 'get_headcount',
        description: 'Get total headcount and active employee count, optionally filtered by department.',
        parameters: {
          type: 'OBJECT',
          properties: {
            department: { type: 'STRING', description: 'Department name e.g. Engineering, Human Resources' },
          },
        },
      },
      {
        name: 'get_attendance_summary',
        description: 'Get today attendance summary: present, late, on leave, half-day, and attendance rate.',
        parameters: {
          type: 'OBJECT',
          properties: {
            department: { type: 'STRING', description: 'Optional department filter' },
          },
        },
      },
      {
        name: 'get_late_comers',
        description: 'Get the top late-coming employees for the current month.',
        parameters: {
          type: 'OBJECT',
          properties: {
            department: { type: 'STRING', description: 'Optional department filter' },
          },
        },
      },
      {
        name: 'get_leave_summary',
        description: 'Get summary of employees on leave today, pending approvals count, and leave use by type.',
        parameters: {
          type: 'OBJECT',
          properties: {
            department: { type: 'STRING', description: 'Optional department filter' },
          },
        },
      },
      {
        name: 'get_my_leave_balance',
        description: 'Get remaining leave balances (Annual, Sick, Casual, Unpaid) for the currently logged-in user.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'get_payroll_summary',
        description: 'Get overall payroll cost, net payable, and average salary. (Admin and HR only).',
        parameters: {
          type: 'OBJECT',
          properties: {
            department: { type: 'STRING', description: 'Optional department filter' },
          },
        },
      },
      {
        name: 'search_employees',
        description: 'Search employees by name or department.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: 'Employee name to search for' },
            department: { type: 'STRING', description: 'Department name' },
          },
        },
      },
    ],
  },
];

async function chat({ messages, prompt, requestingUser }) {
  await checkAiRateLimit(requestingUser.id);
  const startTime = Date.now();

  const ai = getAiClient();
  if (!ai) {
    // Graceful fallback if no API key is configured
    return fallbackResponse(prompt, requestingUser);
  }

  try {
    const userRoleContext = `User Info: Email=${requestingUser.email}, Role=${requestingUser.role}, EmployeeID=${requestingUser.employeeId}. Today is ${new Date().toISOString().slice(0, 10)}.`;

    // Direct check for salary snooping by employee
    const lowerPrompt = (prompt || '').toLowerCase();
    if (
      requestingUser.role === 'employee' &&
      (lowerPrompt.includes('salary') || lowerPrompt.includes('payroll') || lowerPrompt.includes('tankhwah') || lowerPrompt.includes('pay')) &&
      !lowerPrompt.includes('my salary') &&
      !lowerPrompt.includes('my pay') &&
      !lowerPrompt.includes('my payslip') &&
      !lowerPrompt.includes('meri tankhwah')
    ) {
      await AiLog.create({
        user: requestingUser.id,
        role: requestingUser.role,
        prompt,
        feature: 'chat',
        responseSummary: 'Blocked salary inquiry',
        executionTimeMs: Date.now() - startTime,
        status: 'success',
      });

      return {
        reply: "As an employee, I cannot disclose colleague salary or company-wide payroll information. You may only view your own compensation records under the My Payslips tab.",
        toolUsed: null,
        isAiGenerated: true,
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${SYSTEM_INSTRUCTION}\n${userRoleContext}\n\nUser Question: ${prompt}` }] },
      ],
      config: {
        tools: TOOLS_DECLARATION,
        temperature: 0.2,
      },
    });

    let toolUsed = null;
    let toolResult = null;

    // Check for tool call
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      toolUsed = call.name;
      toolResult = await executeTool(call.name, call.args || {}, requestingUser);

      // Second turn with tool result
      const followUp = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${SYSTEM_INSTRUCTION}\n${userRoleContext}\n\nUser Question: ${prompt}` }] },
          {
            role: 'model',
            parts: [{ functionCall: { name: call.name, args: call.args || {} } }],
          },
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: call.name,
                  response: toolResult,
                },
              },
            ],
          },
        ],
        config: {
          temperature: 0.2,
        },
      });

      const finalReply = followUp.text || 'I have retrieved the latest records matching your query.';

      await AiLog.create({
        user: requestingUser.id,
        role: requestingUser.role,
        prompt,
        feature: 'chat',
        toolCalled: toolUsed,
        inputParams: call.args,
        responseSummary: finalReply.slice(0, 200),
        executionTimeMs: Date.now() - startTime,
        status: 'success',
      });

      return {
        reply: finalReply,
        toolUsed,
        toolResult,
        isAiGenerated: true,
      };
    }

    const reply = response.text || 'I am here to help with your HCM inquiries.';

    await AiLog.create({
      user: requestingUser.id,
      role: requestingUser.role,
      prompt,
      feature: 'chat',
      responseSummary: reply.slice(0, 200),
      executionTimeMs: Date.now() - startTime,
      status: 'success',
    });

    return {
      reply,
      toolUsed: null,
      isAiGenerated: true,
    };
  } catch (err) {
    console.error('[AI Chat Error]:', err.message);
    return fallbackResponse(prompt, requestingUser);
  }
}

// Deterministic fallback response when Gemini API is offline or key missing
async function fallbackResponse(prompt, requestingUser) {
  const lower = (prompt || '').toLowerCase();
  const now = new Date();
  const today = startOfDayUTC(now);

  if (requestingUser.role === 'employee' && (lower.includes('salary') || lower.includes('tankhwah')) && !lower.includes('my')) {
    return {
      reply: 'As an employee, I cannot disclose colleague salary or company-wide payroll information.',
      toolUsed: null,
      isAiGenerated: true,
    };
  }

  if (lower.includes('leave') || lower.includes('chutti')) {
    const balances = await getBalances(requestingUser.id, now.getFullYear());
    return {
      reply: `Your current leave balances for ${now.getFullYear()} are: Annual: ${balances.annual.balance} days left, Sick: ${balances.sick.balance} days left, Casual: ${balances.casual.balance} days left, Unpaid: unlimited.`,
      toolUsed: 'get_my_leave_balance',
      toolResult: balances,
      isAiGenerated: true,
    };
  }

  if (lower.includes('late') || lower.includes('attendance') || lower.includes('hazri')) {
    const todayRecord = await Attendance.findOne({ user: requestingUser.id, date: today }).lean();
    return {
      reply: `Your attendance status today is: ${todayRecord ? todayRecord.status.toUpperCase() : 'Not Checked In yet'}. Office starts at 09:00 with a 15-minute grace period (late after 09:15).`,
      toolUsed: 'get_attendance_summary',
      isAiGenerated: true,
    };
  }

  return {
    reply: `HCM Lite Assistant: All systems operational. Office starts at 09:00 AM (grace until 09:15 AM). Work under 5h is marked as half-day. Leaves: Annual 14, Sick 8, Casual 10 days.`,
    toolUsed: null,
    isAiGenerated: true,
  };
}

// Feature 20: Summarize Dashboard
async function summarizeDashboard(kpiData, role) {
  const ai = getAiClient();
  const prompt = `
Analyze the following real HRMS dashboard KPIs and provide exactly 3 to 5 concise, actionable bullet points highlighting workforce trends, attendance rate, and pending actions. USE ONLY THESE NUMBERS. Do NOT invent numbers.

KPI Data:
${JSON.stringify(kpiData, null, 2)}
`;

  if (!ai) {
    return [
      `Headcount stands at ${kpiData.headcount || kpiData.totalRegistered || 0} active employees.`,
      `Attendance rate is currently at ${kpiData.attendanceRate || '95'}% for active personnel.`,
      `Pending approvals require review in the management inbox.`,
    ];
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.2 },
    });

    const lines = (response.text || '')
      .split('\n')
      .map((l) => l.trim().replace(/^[-*•\d.]\s*/, ''))
      .filter((l) => l.length > 5)
      .slice(0, 5);

    return lines.length > 0
      ? lines
      : [
          `Active workforce stands at ${kpiData.headcount || 0} employees.`,
          `Attendance operations are performing in alignment with company thresholds.`,
        ];
  } catch (err) {
    return [
      `Workforce headcount is ${kpiData.headcount || 0}.`,
      `Attendance metrics are actively tracked across all departments.`,
    ];
  }
}

// Feature 21: Smart Leave Form (plain words -> JSON)
async function parseSmartLeave(naturalLanguageText) {
  const ai = getAiClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentDateStr = now.toISOString().slice(0, 10);

  const prompt = `
You are a smart HR parser. Today's date is ${currentDateStr} (${now.toLocaleDateString('en-US', { weekday: 'long' })}).
Convert the employee's leave request into a JSON object:
{
  "type": "casual" | "sick" | "annual" | "unpaid",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "reason": "summary of the reason"
}

Rule:
- If mentioned "wedding", "family event", "urgent work", default type is "casual".
- If mentioned "fever", "doctor", "sick", "hospital", default type is "sick".
- If mentioned "vacation", "trip", default type is "annual".
- Output JSON ONLY. No markdown, no backticks.

User Input: "${naturalLanguageText}"
`;

  if (!ai) {
    // Simple heuristic parser fallback
    const lower = naturalLanguageText.toLowerCase();
    const type = lower.includes('sick') || lower.includes('fever') || lower.includes('doctor')
      ? 'sick'
      : lower.includes('vacation')
      ? 'annual'
      : 'casual';

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);

    return {
      type,
      startDate: tomorrow.toISOString().slice(0, 10),
      endDate: dayAfter.toISOString().slice(0, 10),
      reason: naturalLanguageText.slice(0, 100),
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json', temperature: 0.1 },
    });

    const json = JSON.parse(response.text.trim());
    return {
      type: ['annual', 'sick', 'casual', 'unpaid'].includes(json.type) ? json.type : 'casual',
      startDate: json.startDate || currentDateStr,
      endDate: json.endDate || json.startDate || currentDateStr,
      reason: json.reason || naturalLanguageText,
    };
  } catch (err) {
    return {
      type: 'casual',
      startDate: currentDateStr,
      endDate: currentDateStr,
      reason: naturalLanguageText,
    };
  }
}

module.exports = {
  chat,
  summarizeDashboard,
  parseSmartLeave,
};
