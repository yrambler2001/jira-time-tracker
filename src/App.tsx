import moment from 'moment';
import React, { useState, useMemo, useEffect } from 'react';
import _ from 'lodash'
window.moment = moment;
window._ = _;

// --- TypeScript Interfaces ---
interface JiraTimelog {
  start_date: string;
  end_date: string;
  jira_ticket_id: string;
  jira_ticket_name: string;
  // Adding flexible properties for the fetched data structure
  [key: string]: any;
}

interface ProcessedTimelog extends JiraTimelog {
  startDate: Date;
  endDate: Date;
  startDateMoment: moment.Moment;
  endDateMoment: moment.Moment;
  startDateString: string;
  endDateString: string;
  durationString: string;
}

interface TimelineTooltipProps {
  log: ProcessedTimelog;
}

function formatDuration(start: moment.Moment, end: moment.Moment): string {
  const duration = moment.duration(end.diff(start));

  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);

  // If everything is 0 (start == end), show "0s"
  if (parts.length === 0) parts.push("0s");

  return parts.join(" ");
}

const TimelineTooltip: React.FC<TimelineTooltipProps> = ({ log }) => (
  <div className="timeline-tooltip absolute bottom-full mb-2 w-max bg-gray-800 text-white text-xs rounded py-1 px-2 z-20 shadow-lg">
    <strong className="font-bold">{log.issue.key}:</strong> {log.issue.fields.summary}<br />
    <strong>Start:</strong> {log.startDateString}<br />
    <strong>End:</strong> {log.endDateString}<br />
    <strong>Duration:</strong> {log.durationString}
  </div>
);

interface TimelineBarProps {
  log: ProcessedTimelog;
  minDate: Date;
  maxDateMinDateDuration: number;
  color: string;
}

const TimelineBar: React.FC<TimelineBarProps> = ({ log, minDate, maxDateMinDateDuration, color }) => {
  if (maxDateMinDateDuration <= 0) return null;
  const left = ((log.startDate.getTime() - minDate.getTime()) / maxDateMinDateDuration) * 100;
  const width = ((log.endDate.getTime() - log.startDate.getTime()) / maxDateMinDateDuration) * 100;

  const style: React.CSSProperties = {
    left: `${left}%`,
    width: `${width > 0 ? width : 0.1}%`, // Ensure a minimum visible width
    backgroundColor: color,
  };

  return (
    <div className="timeline-bar absolute top-1/4 h-1/2 rounded-md flex items-center justify-start overflow-hidden" style={style}>
      <span className="text-white font-semibold text-xs whitespace-nowrap" style={{ overflow: 'hidden', display: 'none' }}>{log.issue.key}</span>
      <TimelineTooltip log={log} />
    </div>
  );
};

interface TimelineTableProps {
  logs: ProcessedTimelog[];
}

const TimelineTable: React.FC<TimelineTableProps> = ({ logs }) => {
  return (
    <div className="mt-8 overflow-x-auto max-w-7xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Timelog Details</h2>
      <div className="shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ticket ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ticket Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Start Time</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">End Time</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Duration</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map((log, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{log.issue.key}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300" style={{ maxWidth: 300, textWrap: 'wrap' }}>{log.issue.fields.summary}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{log.startDateString}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{log.endDateString}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{log.durationString}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [backendData, setBackendData] = useState<any>(undefined);
  // State for the date picker, initialized to yesterday
  const [selectedDate, setSelectedDate] = useState<Date>(moment().toDate())//.subtract(1, 'day').toDate());

  useEffect(() => {
    fetch('http://localhost:3999/logs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day: moment(selectedDate).format('YYYY-MM-DD') })
    })
      .then(r => r.json())
      .then((data) => {
        setBackendData(data);
        window.backendData = data
      })
      .catch(err => console.error("Failed to fetch logs:", err));
  }, [selectedDate]);

  const jiraTimelogs = useMemo(() => {
    if (!backendData) return [];

    // const selectedDayStart = moment(selectedDate).startOf('day');
    // const selectedDayEnd = moment(selectedDate).endOf('day');

    return backendData
    // .filter((log: any) => {
    //   const logStart = moment(log.worklog.started);
    //   // Check if the log's start time is within the selected day
    //   return logStart.isBetween(selectedDayStart, selectedDayEnd, undefined, '[]');
    // });

  }, [backendData]);

  const timelineData = useMemo(() => {
    const logsWithDates: ProcessedTimelog[] = jiraTimelogs.map((log: JiraTimelog) => {
      const start = moment(log.worklog.started);
      const end = moment(log.worklog.started).add(log.worklog.timeSpentSeconds, 'second');
      return ({
        ...log,
        startDate: start.toDate(),
        startDateMoment: start,
        endDate: end.toDate(),
        endDateMoment: end,
        startDateString: start.format('YYYY-MM-DD HH:mm:ss') + ' (' + (formatDuration(start, moment())) + ' ago)',
        endDateString: end.format('YYYY-MM-DD HH:mm:ss') + ' (' + (formatDuration(end, moment())) + ' ago)',
        durationString: formatDuration(start, end),
      })
    });

    if (logsWithDates.length === 0) {
      return {
        logsWithDates: [], groupedLogs: {}, uniqueTickets: [], ticketColors: {},
        minDate: new Date(), maxDate: new Date(), maxDateMinDateDuration: 0, xAxisTicks: []
      };
    }

    const groupedLogs = logsWithDates.reduce((acc, log) => {
      (acc[log.issue.fields.project.key] = acc[log.issue.fields.project.key] || []).push(log);
      return acc;
    }, {} as Record<string, ProcessedTimelog[]>);

    const uniqueTickets = Object.keys(groupedLogs);
    const colors = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0', '#546E7A', '#26a69a', '#D10CE8'];
    const ticketColors = uniqueTickets.reduce((acc, ticket, index) => {
      acc[ticket] = colors[index % colors.length];
      return acc;
    }, {} as Record<string, string>);

    const allDates = logsWithDates.flatMap(log => [log.startDate, log.endDate]);
    const minDate = moment(selectedDate).startOf('day').toDate();
    const maxDate = moment(selectedDate).endOf('day').toDate();

    const maxDateMinDateDuration = maxDate.getTime() - minDate.getTime();

    const tickCount = 5;
    const xAxisTicks = Array.from({ length: tickCount + 1 }, (_, i) =>
      new Date(minDate.getTime() + (maxDateMinDateDuration / tickCount) * i)
    );

    return { logsWithDates, groupedLogs, uniqueTickets, ticketColors, minDate, maxDate, maxDateMinDateDuration, xAxisTicks };
  }, [jiraTimelogs, selectedDate]);

  const { logsWithDates, groupedLogs, uniqueTickets, ticketColors, minDate, maxDateMinDateDuration, xAxisTicks } = timelineData;

  // Helper to format Date to 'YYYY-MM-DD' for input value
  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return moment(date).format('YYYY-MM-DD');
  };

  return (
    <>
      <style>{`
            .timeline-grid { background-size: 20% 100%; background-image: linear-gradient(to right, #e5e7eb 1px, transparent 1px); }
            .dark .timeline-grid { background-image: linear-gradient(to right, #4b5563 1px, transparent 1px); }
            .timeline-bar { transition: all 0.2s ease-in-out; }
            .timeline-bar:hover { transform: scaleY(1.1); z-index: 10; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
            .timeline-tooltip { visibility: hidden; opacity: 0; transition: opacity 0.2s; }
            .timeline-bar:hover .timeline-tooltip { visibility: visible; opacity: 1; }
        `}</style>
      <div className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b dark:border-gray-700 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Jira Timelogs Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">For developers by developers.</p>
            </div>
            <div className="flex items-center gap-4 mt-4 sm:mt-0">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Select Date</label>
                <input
                  type="date"
                  value={formatDateForInput(selectedDate)}
                  onChange={(e) => setSelectedDate(e.target.value ? moment(e.target.value).toDate() : new Date())}
                  className="w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                />
              </div>
            </div>
          </div>

          {logsWithDates.length > 0 ? (
            <div className="w-full h-full text-sm">
              <div className="grid grid-cols-[150px_1fr]">
                <div className="pr-4 border-r border-gray-200 dark:border-gray-700">
                  {uniqueTickets.map(ticketName => (
                    <div key={ticketName} className="h-16 flex items-center font-medium text-gray-700 dark:text-gray-300 truncate">
                      {ticketName}
                    </div>
                  ))}
                </div>

                <div className="relative pl-4">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {xAxisTicks.map((tickDate, i) => (
                      <span key={i}>
                        {moment(tickDate).format('HH:mm')}
                      </span>
                    ))}
                  </div>

                  <div className="relative timeline-grid">
                    {uniqueTickets.map(ticketName => (
                      <div key={ticketName} className="h-16 relative border-b border-gray-200 dark:border-gray-700">
                        {groupedLogs[ticketName].map((log, index) => (
                          <TimelineBar
                            key={`${log.worklog.id}-${index}`}
                            log={log}
                            minDate={minDate}
                            maxDateMinDateDuration={maxDateMinDateDuration}
                            color={ticketColors[ticketName]}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400">No timelogs found for the selected date.</p>
            </div>
          )}
        </div>
        {logsWithDates.length > 0 && <TimelineTable logs={logsWithDates} />}
      </div>
    </>
  );
}
