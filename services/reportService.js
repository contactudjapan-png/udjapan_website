const registrationService = require('./registrationService');
const expenseService = require('./expenseService');
const pollService = require('./pollService');
const volunteerService = require('./volunteerService');
const submissionService = require('./submissionService');
const db = require('../config/db');

// Compute 3-period simple moving average for a sorted series [{date, value}]
function movingAverage(series, window = 3) {
  return series.map((point, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    const avg = slice.reduce((s, p) => s + p.value, 0) / slice.length;
    return { date: point.date, avg: parseFloat(avg.toFixed(2)) };
  });
}

// Linear regression forecast over n future periods
function linearForecast(series, periods = 3) {
  if (series.length < 2) return [];
  const n = series.length;
  const xMean = (n - 1) / 2;
  const yMean = series.reduce((s, p) => s + p.value, 0) / n;
  let num = 0, den = 0;
  series.forEach((p, i) => {
    num += (i - xMean) * (p.value - yMean);
    den += (i - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const forecast = [];
  for (let i = 1; i <= periods; i++) {
    const x = n - 1 + i;
    forecast.push({
      date: `+${i}`,
      value: Math.max(0, parseFloat((slope * x + intercept).toFixed(2))),
    });
  }
  return forecast;
}

async function getEventReport(eventId) {
  const [registrations, expenses, polls, volunteers, submissions] = await Promise.all([
    registrationService.getRegistrationsByEvent(eventId),
    expenseService.getExpensesByEvent(eventId),
    pollService.getPollsByEvent(eventId),
    volunteerService.getVolunteersByEvent(eventId),
    submissionService.getSubmissionsByEvent(eventId),
  ]);

  const totalRegistrations = registrations.length;
  const paidCount = registrations.filter(r => r.is_paid).length;
  const unpaidCount = totalRegistrations - paidCount;
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  // ── Registration trend by date ──
  const regClusters = {};
  for (const reg of registrations) {
    const date = reg.created_at ? reg.created_at.substring(0, 10) : 'unknown';
    regClusters[date] = (regClusters[date] || 0) + 1;
  }
  const registrationByDate = Object.entries(regClusters)
    .map(([date, count]) => ({ date, count, value: count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const regMovingAvg = movingAverage(registrationByDate);
  const regForecast = linearForecast(registrationByDate, 3);

  // ── Expense trend by date ──
  const expClusters = {};
  for (const exp of expenses) {
    const date = exp.created_at ? exp.created_at.substring(0, 10) : 'unknown';
    expClusters[date] = (expClusters[date] || 0) + parseFloat(exp.amount || 0);
  }
  const expenseByDate = Object.entries(expClusters)
    .map(([date, amount]) => ({ date, amount: parseFloat(amount.toFixed(2)), value: parseFloat(amount.toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const expMovingAvg = movingAverage(expenseByDate);
  const expForecast = linearForecast(expenseByDate, 3);

  // ── Volunteer breakdown ──
  const volunteerStats = {
    total: volunteers.length,
    approved: volunteers.filter(v => v.status === 'approved').length,
    pending: volunteers.filter(v => v.status === 'pending').length,
    rejected: volunteers.filter(v => v.status === 'rejected').length,
  };

  // ── Poll results ──
  const pollResults = polls.map(poll => {
    const totalVotes = poll.options.reduce((s, o) => s + (o.vote_count || 0), 0);
    return {
      ...poll,
      totalVotes,
      options: poll.options.map(o => ({
        ...o,
        pct: totalVotes > 0 ? Math.round(((o.vote_count || 0) / totalVotes) * 100) : 0,
      })),
    };
  });

  // ── Forecast suggestions ──
  const avgDailyReg = registrationByDate.length > 0
    ? (totalRegistrations / registrationByDate.length).toFixed(1)
    : 0;
  const avgDailyExpense = expenseByDate.length > 0
    ? (totalExpenses / expenseByDate.length).toFixed(2)
    : 0;

  const suggestions = [];
  if (regForecast.length > 0) {
    const projectedRegs = Math.round(totalRegistrations + regForecast.reduce((s, f) => s + f.value, 0));
    suggestions.push(`Based on current trend, projected total registrations in next 3 periods: ~${projectedRegs}`);
  }
  if (expForecast.length > 0) {
    const projectedExp = (totalExpenses + expForecast.reduce((s, f) => s + f.value, 0)).toFixed(2);
    suggestions.push(`Projected total expenses in next 3 periods: ~€${projectedExp}`);
  }
  if (unpaidCount > 0) {
    suggestions.push(`${unpaidCount} registration(s) still pending payment — follow up may be needed.`);
  }
  if (volunteerStats.pending > 0) {
    suggestions.push(`${volunteerStats.pending} volunteer(s) awaiting approval.`);
  }

  return {
    totalRegistrations,
    paidCount,
    unpaidCount,
    totalExpenses,
    registrations,
    expenses,
    registrationByDate,
    regMovingAvg,
    regForecast,
    expenseByDate,
    expMovingAvg,
    expForecast,
    volunteerStats,
    pollResults,
    submissions,
    pendingSubmissions: submissions.length,
    suggestions,
    avgDailyReg,
    avgDailyExpense,
  };
}

async function getDashboardStats() {
  const { data: events } = await db.from('events').select('*');
  const { data: registrations } = await db.from('registrations').select('*');
  const { data: expenses } = await db.from('expenses').select('*');

  const totalEvents = (events || []).length;
  const activeEvents = (events || []).filter(e => e.is_active).length;
  const totalRegistrations = (registrations || []).length;
  const paidRegistrations = (registrations || []).filter(r => r.is_paid).length;

  const eventStats = (events || []).map(event => {
    const eventRegs = (registrations || []).filter(r => r.event_id === event.id);
    const eventExpenses = (expenses || []).filter(e => e.event_id === event.id);
    return {
      ...event,
      regCount: eventRegs.length,
      paidCount: eventRegs.filter(r => r.is_paid).length,
      totalExpenses: eventExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
    };
  });

  return { totalEvents, activeEvents, totalRegistrations, paidRegistrations, eventStats };
}

module.exports = { getEventReport, getDashboardStats };
