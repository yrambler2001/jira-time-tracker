import React from 'react';
import type { ProcessedTimelog, TrackedTicket, JiraTicket } from '../types/jira';
import { StarIcon } from './Icons';

interface TimelineTableProps {
  logs: (ProcessedTimelog | TrackedTicket)[];
  hoveredLogId: string | null;
  setHoveredLogId: (id: string | null) => void;
  onRowClick: (log: ProcessedTimelog) => void;
  onEditTracking: (log: TrackedTicket) => void;
  onStopTracking: (trackingId: string) => void;
  onDiscardTracking: (trackingId: string) => void;
  onStartTracking: (ticket: JiraTicket) => void;
  onAddLog: (ticket: JiraTicket) => void;
  onDeleteLog: (log: ProcessedTimelog) => void;
  starredTickets: string[];
  toggleStar: (key: string) => void;
}

const TimelineTable: React.FC<TimelineTableProps> = ({
  logs,
  hoveredLogId,
  setHoveredLogId,
  onRowClick,
  onEditTracking,
  onStopTracking,
  onDiscardTracking,
  onStartTracking,
  onAddLog,
  onDeleteLog,
  starredTickets,
  toggleStar,
}) => (
  <div className="mt-8 max-w-7xl mx-auto">
    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Timelog Details</h2>
    <div className="shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg overflow-x-auto">
      <table className="min-w-[950px] lg:min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th
              scope="col"
              className="w-1/12 px-3 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              Star
            </th>
            <th scope="col" className="w-1/6 px-3 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Ticket ID
            </th>
            <th scope="col" className="w-1/4 px-3 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Ticket Name
            </th>
            <th scope="col" className="w-1/4 px-3 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Work Description
            </th>
            <th scope="col" className="w-1/6 px-3 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Start Time
            </th>
            <th scope="col" className="w-1/6 px-3 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              End Time
            </th>
            <th
              scope="col"
              className="w-1/12 px-3 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              Duration
            </th>
            <th
              scope="col"
              className="w-auto px-3 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 break-words">
          {logs.map((log) => (
            <tr
              key={log.id}
              className={`transition-colors duration-200 cursor-pointer ${
                hoveredLogId === log.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              onMouseEnter={() => setHoveredLogId(log.id)}
              onMouseLeave={() => setHoveredLogId(null)}
              onClick={() => {
                if (log.isTracking) {
                  onEditTracking(log as TrackedTicket);
                } else {
                  onRowClick(log as ProcessedTimelog);
                }
              }}
            >
              <td className="px-3 lg:px-4 xl:px-6 py-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStar(log.issue.key);
                  }}
                  className={`p-1 rounded-full transition-colors ${
                    starredTickets.includes(log.issue.key) ? 'text-yellow-400 hover:text-yellow-500' : 'text-gray-400 hover:text-yellow-400'
                  }`}
                >
                  <StarIcon filled={starredTickets.includes(log.issue.key)} />
                </button>
              </td>
              <td className="px-3 lg:px-4 xl:px-6 py-4 text-sm font-medium text-gray-900 dark:text-white break-words">
                {log.issue.self ? (
                  <a
                    href={`${new URL(log.issue.self).origin}/browse/${log.issue.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {log.issue.key}
                  </a>
                ) : (
                  log.issue.key
                )}
              </td>
              <td className="px-3 lg:px-4 xl:px-6 py-4 text-sm text-gray-500 dark:text-gray-300" style={{ wordBreak: 'break-word' }}>
                {log.issue.fields.summary}
              </td>
              <td className="px-3 lg:px-4 xl:px-6 py-4 text-sm text-gray-500 dark:text-gray-300 whitespace-pre-line" style={{ wordBreak: 'break-word' }}>
                {log.isTracking ? log.workDescription || <i className="text-gray-400">In progress...</i> : (log as ProcessedTimelog).workDescription}
              </td>
              <td className="px-3 lg:px-4 xl:px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{log.startDateDisplay}</td>
              <td className="px-3 lg:px-4 xl:px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                {!log.isTracking ? (log as ProcessedTimelog).endDateDisplay : ''}
              </td>
              <td className="px-3 lg:px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{log.durationString}</td>
              <td className="px-3 lg:px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                {log.isTracking ? (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStopTracking(log.id);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded"
                    >
                      Stop
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDiscardTracking(log.id);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded"
                    >
                      Discard
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 w-28">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartTracking({
                          key: log.issue.key,
                          summary: log.issue.fields.summary,
                          self: log.issue.self,
                        });
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded"
                    >
                      Start
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddLog({ key: log.issue.key, summary: log.issue.fields.summary, self: log.issue.self });
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded"
                    >
                      Add
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(log as ProcessedTimelog);
                      }}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs py-1 px-2 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLog(log as ProcessedTimelog);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default TimelineTable;
