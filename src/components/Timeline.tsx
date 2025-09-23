import React from 'react';
import moment from 'moment';
import type { ProcessedTimelog } from '../types/jira';

interface TimelineTooltipProps {
  log: ProcessedTimelog;
}
const TimelineTooltip: React.FC<TimelineTooltipProps> = ({ log }) => (
  <div className="timeline-tooltip absolute bottom-full mb-2 w-80 max-w-xs bg-gray-800 text-white text-xs rounded py-1 px-2 z-20 shadow-lg break-words whitespace-pre-line">
    <strong className="font-bold">{log.issue.key}:</strong> {log.issue.fields.summary}
    <br /> <strong>Start:</strong> {log.startDateString}
    <br /> <strong>End:</strong> {log.endDateString}
    <br /> <strong>Duration:</strong> {log.durationString}
    {log.workDescription ? (
      <>
        <br />
        <strong>Work Description:</strong> {log.workDescription}
      </>
    ) : null}
  </div>
);

interface TimelineBarProps {
  log: ProcessedTimelog;
  minDate: Date;
  maxDateMinDateDuration: number;
  color: string;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}
const TimelineBar: React.FC<TimelineBarProps> = ({ log, minDate, maxDateMinDateDuration, color, isHovered, onMouseEnter, onMouseLeave, onClick }) => {
  if (maxDateMinDateDuration <= 0) return null;
  const left = ((log.startDate.getTime() - minDate.getTime()) / maxDateMinDateDuration) * 100;
  const width = ((log.endDate.getTime() - log.startDate.getTime()) / maxDateMinDateDuration) * 100;
  const style: React.CSSProperties = {
    left: `${left}%`,
    width: `${width > 0 ? width : 0.1}%`,
    backgroundColor: color,
    opacity: isHovered ? 1 : 0.8,
    transform: isHovered ? 'scaleY(1.1)' : 'scaleY(1)',
  };
  return (
    <div
      className="timeline-bar absolute top-1/4 h-1/2 rounded-md flex items-center justify-start overflow-hidden cursor-pointer"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <span className="text-white font-semibold text-xs whitespace-nowrap" style={{ overflow: 'hidden', display: 'none' }}>
        {log.issue.key}
      </span>
      <TimelineTooltip log={log} />
    </div>
  );
};

interface TimelineProps {
  timelineData: any;
  hoveredLogId: string | null;
  setHoveredLogId: (id: string | null) => void;
  handleRowClick: (log: ProcessedTimelog) => void;
}

const Timeline: React.FC<TimelineProps> = ({ timelineData, hoveredLogId, setHoveredLogId, handleRowClick }) => {
  const { allLogs, groupedLogs, uniqueTickets, ticketColors, minDate, maxDateMinDateDuration, xAxisTicks, displayMode } = timelineData;
  return (
    <div className="w-full h-full text-sm">
      <div className="grid grid-cols-[150px_1fr]">
        <div className="pr-4 border-r border-gray-200 dark:border-gray-700">
          {displayMode === 'grouped'
            ? uniqueTickets.map((ticketName: string) => (
                <div key={ticketName} className="h-16 flex items-center font-medium text-gray-700 dark:text-gray-300 truncate">
                  {ticketName}
                </div>
              ))
            : allLogs
                .filter((log: any) => !log.isTracking)
                .map((log: any) => (
                  <div
                    key={log.id}
                    className="h-16 flex items-center font-medium text-gray-700 dark:text-gray-300 truncate"
                    title={`${log.issue.key}: ${log.issue.fields.summary}`}
                  >
                    {log.issue.key}
                  </div>
                ))}
        </div>
        <div className="relative pl-4">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            {xAxisTicks.map((tickDate: Date, i: number) => (
              <span key={i}>{moment(tickDate).format('HH:mm')}</span>
            ))}
          </div>
          <div className="relative timeline-grid">
            {displayMode === 'grouped'
              ? uniqueTickets.map((ticketName: string) => (
                  <div key={ticketName} className="h-16 relative border-b border-gray-200 dark:border-gray-700">
                    {groupedLogs[ticketName].map((log: ProcessedTimelog) => (
                      <TimelineBar
                        key={log.id}
                        log={log}
                        minDate={minDate}
                        maxDateMinDateDuration={maxDateMinDateDuration}
                        color={ticketColors[log.issue.key]}
                        isHovered={hoveredLogId === log.id}
                        onMouseEnter={() => setHoveredLogId(log.id)}
                        onMouseLeave={() => setHoveredLogId(null)}
                        onClick={() => handleRowClick(log)}
                      />
                    ))}
                  </div>
                ))
              : allLogs
                  .filter((log: any) => !log.isTracking)
                  .map((log: any) => (
                    <div key={log.id} className="h-16 relative border-b border-gray-200 dark:border-gray-700">
                      <TimelineBar
                        key={log.id}
                        log={log as ProcessedTimelog}
                        minDate={minDate}
                        maxDateMinDateDuration={maxDateMinDateDuration}
                        color={ticketColors[log.issue.key]}
                        isHovered={hoveredLogId === log.id}
                        onMouseEnter={() => setHoveredLogId(log.id)}
                        onMouseLeave={() => setHoveredLogId(null)}
                        onClick={() => handleRowClick(log as ProcessedTimelog)}
                      />
                    </div>
                  ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
