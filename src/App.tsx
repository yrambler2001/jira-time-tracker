import React, { useState, useMemo, useEffect, useCallback } from 'react';
import _ from 'lodash';
import moment from 'moment';
import { JiraApiClient } from './model';

// Makes sure global libraries are available for debugging if needed
window.moment = moment;
window._ = _;

// --- TypeScript Interfaces ---
interface JiraTimelog {
  start_date: string;
  end_date: string;
  jira_ticket_id: string;
  jira_ticket_name: string;
  [key: string]: any; // Allows for flexible properties from the API
}

interface ProcessedTimelog extends JiraTimelog {
  id: string; // Unique identifier for each log
  startDate: Date;
  endDate: Date;
  startDateMoment: moment.Moment;
  endDateMoment: moment.Moment;
  startDateString: string;
  endDateString: string;
  startDateDisplay: React.ReactNode;
  endDateDisplay: React.ReactNode;
  durationString: string;
  workDescription: string;
  isTracking?: false;
}

interface Settings {
  jiraToken: string;
  email: string;
  displayOnNewLine: boolean;
}

interface JiraTicket {
  key: string;
  summary: string;
}

interface TrackedTicket {
  id: string;
  issue: {
    key: string;
    fields: {
      summary: string;
    };
  };
  startDate: Date;
  startDateMoment: moment.Moment;
  startDateDisplay: React.ReactNode;
  durationString: string;
  isTracking: true;
}

// --- Helper Functions ---
function formatDuration(start: moment.Moment, end: moment.Moment): string {
  const duration = moment.duration(end.diff(start));
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  if (parts.length === 0) return '0s';
  return parts.join(' ');
}

function parseDurationToSeconds(durationStr: string): number {
  let totalSeconds = 0;
  const hoursMatch = durationStr.match(/(\d+)\s*h/);
  const minutesMatch = durationStr.match(/(\d+)\s*m/);
  const secondsMatch = durationStr.match(/(\d+)\s*s/);
  if (hoursMatch) totalSeconds += parseInt(hoursMatch[1]) * 3600;
  if (minutesMatch) totalSeconds += parseInt(minutesMatch[1]) * 60;
  if (secondsMatch) totalSeconds += parseInt(secondsMatch[1]);
  if (!hoursMatch && !minutesMatch && !secondsMatch && !isNaN(parseInt(durationStr))) {
    return parseInt(durationStr); // Assume seconds if no unit
  }
  return totalSeconds;
}

function formatSecondsToDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  if (parts.length === 0) return '0s';
  return parts.join(' ');
}

const extractTextFromAtlassianDocumentFormat = (node: any): string => {
  if (!node) return '';

  switch (node.type) {
    case 'text':
      return node.text || '';
    case 'inlineCard':
      return node.attrs.url || '';
    case 'paragraph':
    case 'doc':
    case 'blockquote':
    case 'heading':
      return (node.content || []).map(extractTextFromAtlassianDocumentFormat).join('');
    case 'bulletList':
    case 'orderedList':
      return (node.content || []).map(extractTextFromAtlassianDocumentFormat).join('\n');
    case 'listItem':
      return `- ${(node.content || []).map(extractTextFromAtlassianDocumentFormat).join('')}\n`;
    default:
      return (node.content || []).map(extractTextFromAtlassianDocumentFormat).join('');
  }
};

// --- SVG Icons ---

const SettingsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const CalculatorIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="16" y1="14" x2="16" y2="18" />
    <line x1="12" y1="10" x2="12" y2="18" />
    <line x1="8" y1="10" x2="8" y2="18" />
  </svg>
);

// --- Modal Components ---

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const timer = setTimeout(() => setIsAnimating(true), 10); // Start animation after render
      return () => clearTimeout(timer);
    }
    setIsAnimating(false);
    const timer = setTimeout(() => setIsRendered(false), 300); // Unmount after animation
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <div className={`fixed inset-0 z-50 flex justify-center items-center ${isRendered ? 'visible' : 'invisible'}`} onClick={onClose}>
      <div className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`} />
      <div
        className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-300 ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b pb-3 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, setSettings }) => {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  const handleSave = () => {
    setSettings(localSettings);
    localStorage.setItem('jiraTimelogSettings', JSON.stringify(localSettings));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Email</label>
          <input
            type="text"
            value={localSettings.email}
            onChange={(e) => setLocalSettings({ ...localSettings, email: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jira API Token</label>
          <input
            type="password"
            value={localSettings.jiraToken}
            onChange={(e) => setLocalSettings({ ...localSettings, jiraToken: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
          />
          <a
            href="https://id.atlassian.com/manage-profile/security/api-tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline mt-1 inline-block"
          >
            How to create an API token
          </a>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Display each item on a new line</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.displayOnNewLine}
              onChange={(e) => setLocalSettings({ ...localSettings, displayOnNewLine: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
          </label>
        </div>
        <div className="flex justify-end pt-4">
          <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

type AutoCalcField = 'start' | 'end' | 'duration';

interface TimelogFormProps {
  initialData: {
    startDateMoment: moment.Moment;
    endDateMoment: moment.Moment;
    durationString: string;
    description: string;
  };
  onSave: (data: any) => void;
  onDelete?: () => void;
  buttonText: string;
}

const TimelogForm: React.FC<TimelogFormProps> = ({ initialData, onSave, onDelete, buttonText }) => {
  const [startTime, setStartTime] = useState(initialData.startDateMoment.format('YYYY-MM-DD HH:mm:ss'));
  const [endTime, setEndTime] = useState(initialData.endDateMoment.format('YYYY-MM-DD HH:mm:ss'));
  const [duration, setDuration] = useState(initialData.durationString);
  const [description, setDescription] = useState(initialData.description);
  const [autoCalcField, setAutoCalcField] = useState<AutoCalcField>('duration');
  const [lastEdited, setLastEdited] = useState<AutoCalcField | null>(null);

  useEffect(() => {
    const startMoment = moment(startTime, 'YYYY-MM-DD HH:mm:ss');
    const endMoment = moment(endTime, 'YYYY-MM-DD HH:mm:ss');
    const durationSeconds = parseDurationToSeconds(duration);

    if (!startMoment.isValid() || !endMoment.isValid() || !lastEdited) return;

    if (autoCalcField === 'start') {
      const newStart = endMoment.clone().subtract(durationSeconds, 'seconds');
      setStartTime(newStart.format('YYYY-MM-DD HH:mm:ss'));
    } else if (autoCalcField === 'end') {
      const newEnd = startMoment.clone().add(durationSeconds, 'seconds');
      setEndTime(newEnd.format('YYYY-MM-DD HH:mm:ss'));
    } else if (autoCalcField === 'duration') {
      const newDuration = moment.duration(endMoment.diff(startMoment)).asSeconds();
      setDuration(formatSecondsToDuration(newDuration));
    }
  }, [startTime, endTime, duration, autoCalcField, lastEdited]);

  const handleSave = () => {
    const startMoment = moment(startTime, 'YYYY-MM-DD HH:mm:ss');
    const endMoment = moment(endTime, 'YYYY-MM-DD HH:mm:ss');
    const durationSeconds = endMoment.diff(startMoment, 'seconds');
    onSave({ started: startMoment.toISOString(), timeSpentSeconds: durationSeconds, comment: description });
  };

  const renderAutoCalcRadio = (field: AutoCalcField) => (
    <button
      onClick={() => setAutoCalcField(field)}
      className={`p-1 rounded ${autoCalcField === field ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
    >
      <CalculatorIcon />
    </button>
  );

  const getInputClass = (field: AutoCalcField) => {
    const baseClass = 'block w-full p-2 border rounded-md bg-transparent dark:border-gray-600 dark:text-gray-300';
    return autoCalcField === field ? `${baseClass} bg-gray-100 dark:bg-gray-700` : baseClass;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Work Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300">Start</label>
          <input
            type="text"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setLastEdited('start');
            }}
            disabled={autoCalcField === 'start'}
            className={getInputClass('start')}
          />
          {renderAutoCalcRadio('start')}
        </div>
        <div className="flex items-center gap-2">
          <label className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300">End</label>
          <input
            type="text"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              setLastEdited('end');
            }}
            disabled={autoCalcField === 'end'}
            className={getInputClass('end')}
          />
          {renderAutoCalcRadio('end')}
        </div>
        <div className="flex items-center gap-2">
          <label className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300">Duration</label>
          <input
            type="text"
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              setLastEdited('duration');
            }}
            disabled={autoCalcField === 'duration'}
            className={getInputClass('duration')}
          />
          {renderAutoCalcRadio('duration')}
        </div>
      </div>
      <div className="flex justify-between items-center pt-4">
        {onDelete && (
          <button onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
            Delete
          </button>
        )}
        <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-auto">
          {buttonText}
        </button>
      </div>
    </div>
  );
};

interface EditTimelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: ProcessedTimelog | null;
  client: JiraApiClient | null;
  onUpdate: () => void;
}
const EditTimelogModal: React.FC<EditTimelogModalProps> = ({ isOpen, onClose, log, client, onUpdate }) => {
  if (!log || !client) return null;

  const initialData = {
    startDateMoment: log.startDateMoment,
    endDateMoment: log.endDateMoment,
    durationString: log.durationString,
    description: log.workDescription || '',
  };

  const handleSave = async (data: any) => {
    try {
      await client.updateWorklog(log.issue.key, log.id, data);
      onUpdate();
    } catch (error) {
      console.error('Failed to update worklog:', error);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this worklog?')) {
      try {
        await client.deleteWorklog(log.issue.key, log.id);
        onUpdate();
      } catch (error) {
        console.error('Failed to delete worklog:', error);
      }
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Timelog for ${log.issue.key}`}>
      <TimelogForm initialData={initialData} onSave={handleSave} onDelete={handleDelete} buttonText="Update Timelog" />
    </Modal>
  );
};

interface AddTimelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: JiraTicket | null;
  client: JiraApiClient | null;
  onUpdate: () => void;
}
const AddTimelogModal: React.FC<AddTimelogModalProps> = ({ isOpen, onClose, ticket, client, onUpdate }) => {
  if (!ticket || !client) return null;
  const initialData = {
    startDateMoment: moment().subtract(10, 'minutes'),
    endDateMoment: moment(),
    durationString: '10m',
    description: '',
  };

  const handleSave = async (data: any) => {
    try {
      await client.addWorklog(ticket.key, data);
      onUpdate();
    } catch (error) {
      console.error('Failed to add worklog:', error);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Timelog for ${ticket.key}`}>
      <TimelogForm initialData={initialData} onSave={handleSave} buttonText="Add Timelog" />
    </Modal>
  );
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLog: (ticket: JiraTicket) => void;
  onStartTracking: (ticket: JiraTicket) => void;
  client: JiraApiClient | null;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onAddLog, onStartTracking, client }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<JiraTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      return;
    }

    const handler = setTimeout(() => {
      if (searchTerm.length > 2 && client) {
        setIsLoading(true);
        client
          .findIssuesWithPicker(searchTerm)
          .then((response) => {
            const tickets = response.sections.flatMap((section) => section.issues.map((issue) => ({ key: issue.key, summary: issue.summaryText })));
            setSearchResults(tickets);
          })
          .catch((err) => console.error('Search failed:', err))
          .finally(() => setIsLoading(false));
      } else {
        setSearchResults([]);
      }
    }, 500); // Debounce search

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, client, isOpen]);

  const handleStartTracking = (ticket: JiraTicket) => {
    onStartTracking(ticket);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Jira Ticket">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search by ticket number or summary..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
          autoFocus
        />
        <div className="max-h-60 overflow-y-auto">
          {isLoading && <div className="p-2 text-center text-gray-500">Searching...</div>}
          {!isLoading &&
            searchResults.map((ticket) => (
              <div key={ticket.key} className="p-2 border-b dark:border-gray-700 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400">{ticket.key}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{ticket.summary}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleStartTracking(ticket)} className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded">
                    Start Tracking
                  </button>
                  <button onClick={() => onAddLog(ticket)} className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded">
                    Add Log
                  </button>
                </div>
              </div>
            ))}
          {!isLoading && searchTerm.length > 2 && searchResults.length === 0 && <div className="p-2 text-center text-gray-500">No results found.</div>}
        </div>
      </div>
    </Modal>
  );
};

// --- UI Components ---

interface TimelineTooltipProps {
  log: ProcessedTimelog;
}
const TimelineTooltip: React.FC<TimelineTooltipProps> = ({ log }) => (
  <div className="timeline-tooltip absolute bottom-full mb-2 w-80 max-w-xs bg-gray-800 text-white text-xs rounded py-1 px-2 z-20 shadow-lg whitespace-normal break-words">
    <strong className="font-bold">{log.issue.key}:</strong> {log.issue.fields.summary}
    <br /> <strong>Start:</strong> {log.startDateString}
    <br /> <strong>End:</strong> {log.endDateString}
    <br /> <strong>Duration:</strong> {log.durationString}
    <br />
    <strong>Work:</strong> {log.workDescription}
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
interface TimelineTableProps {
  logs: (ProcessedTimelog | TrackedTicket)[];
  hoveredLogId: string | null;
  setHoveredLogId: (id: string | null) => void;
  onRowClick: (log: ProcessedTimelog) => void;
  onStopTracking: (ticketKey: string) => void;
  onDiscardTracking: (ticketKey: string) => void;
}
const TimelineTable: React.FC<TimelineTableProps> = ({ logs, hoveredLogId, setHoveredLogId, onRowClick, onStopTracking, onDiscardTracking }) => (
  <div className="mt-8 max-w-7xl mx-auto">
    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Timelog Details</h2>
    <div className="shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Ticket ID
            </th>
            <th scope="col" className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Ticket Name
            </th>
            <th scope="col" className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Work Description
            </th>
            <th scope="col" className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Start Time
            </th>
            <th scope="col" className="w-1/6 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              End Time
            </th>
            <th scope="col" className="w-1/12 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Duration
            </th>
            <th scope="col" className="w-1/12 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 break-all">
          {logs.map((log) => (
            <tr
              key={log.id}
              className={`transition-colors duration-200 ${!log.isTracking ? 'cursor-pointer' : ''} ${hoveredLogId === log.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-50 dark:hover:bg-gray-600'}`}
              onMouseEnter={() => setHoveredLogId(log.id)}
              onMouseLeave={() => setHoveredLogId(null)}
              onClick={() => !log.isTracking && onRowClick(log as ProcessedTimelog)}
            >
              <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white break-words">{log.issue.key}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 break-words">{log.issue.fields.summary}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 break-words">
                {!log.isTracking ? (log as ProcessedTimelog).workDescription : <i className="text-gray-400">In progress...</i>}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{log.startDateDisplay}</td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{!log.isTracking ? (log as ProcessedTimelog).endDateDisplay : ''}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{log.durationString}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                {log.isTracking && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStopTracking(log.issue.key);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded"
                    >
                      Stop
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDiscardTracking(log.issue.key);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded"
                    >
                      Discard
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

interface State {
  trackedTickets: {
    [key: string]: {
      startTime: string;
      summary: string;
    };
  };
}

const parseState = (state: string) => {
  let parsed: State | null = null;
  try {
    parsed = JSON.parse(state);
  } catch (e) {
    console.error('can not parse data ', e);
  }
  if (!parsed || typeof parsed !== 'object') parsed = { trackedTickets: {} };
  if (!parsed.trackedTickets) parsed.trackedTickets = {};
  return parsed as State;
};
const stringifyState = (state: State) => {
  const stringified = JSON.stringify(state);
  return stringified;
};
interface InitProps {
  setState: (state: State) => void;
  client: JiraApiClient;
}
interface SubmitStateProps {
  state: State;
  client: JiraApiClient;
}

let lastSubmittedState: string = 'blank';
const init = async ({ setState, client }: InitProps) => {
  const stateText = await client.getUserProperty('com.yrambler2001.jira-tracker');
  const parsedState = parseState(stateText);
  lastSubmittedState = stringifyState(parsedState);
  setState(parsedState);
};
const submitState = async ({ state, client }: SubmitStateProps) => {
  const stateText = stringifyState(state);
  if (lastSubmittedState === stateText) return;
  console.log('Submitting new state:', stateText);
  await client.setUserProperty('com.yrambler2001.jira-tracker', stateText);
  lastSubmittedState = stateText;
};

// --- Main App Component ---
export default function App() {
  const [client, setClient] = useState<JiraApiClient | null>(null);
  const [backendData, setBackendData] = useState<any>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date>(moment().toDate());
  const [hoveredLogId, setHoveredLogId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(moment());

  // State for modals
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);
  const [isAddLogModalOpen, setAddLogModalOpen] = useState(false);

  const [editingLog, setEditingLog] = useState<ProcessedTimelog | null>(null);
  const [ticketForAddLog, setTicketForAddLog] = useState<JiraTicket | null>(null);

  // State for settings
  const [settings, setSettings] = useState<Settings>({ email: '', jiraToken: '', displayOnNewLine: false });

  const [state, setState] = useState<State>({ trackedTickets: {} });

  useEffect(() => {
    if (client && state) {
      submitState({ state, client });
    }
  }, [client, state]);

  // Load settings from localStorage on initial render
  useEffect(() => {
    const savedSettings = localStorage.getItem('jiraTimelogSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Update current time every second for tracking timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(moment());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchWorklogs = useCallback(() => {
    if (!client) return;
    client
      .getLogsForDay(moment(selectedDate).format('YYYY-MM-DD'))
      .then((data) => {
        setBackendData(data);
        window.backendData = data;
      })
      .catch((err) => console.error('Failed to fetch logs:', err));
  }, [client, selectedDate]);

  // Fetch data when date changes or client is initialized
  useEffect(() => {
    if (!settings.email || !settings.jiraToken) return;
    JiraApiClient.initialize({ email: settings.email, apiToken: settings.jiraToken, jiraBaseUrl: '/test1' }).then(async (client) => {
      setClient(client);
      await init({ client, setState });
      window.client = client;
    });
  }, [settings?.email, settings?.jiraToken]);

  useEffect(() => {
    fetchWorklogs();
  }, [fetchWorklogs]);

  const jiraTimelogs = useMemo(() => backendData || [], [backendData]);

  const timelineData = useMemo(() => {
    const logsWithDates: ProcessedTimelog[] = jiraTimelogs.map((log: JiraTimelog) => {
      const start = moment(log.worklog.started);
      const end = moment(log.worklog.started).add(log.worklog.timeSpentSeconds, 'second');
      return {
        ...log,
        id: log.worklog.id,
        startDate: start.toDate(),
        startDateMoment: start,
        endDate: end.toDate(),
        endDateMoment: end,
        startDateString: `${start.format('YYYY-MM-DD HH:mm:ss')} (${start.from(currentTime)})`,
        endDateString: `${end.format('YYYY-MM-DD HH:mm:ss')} (${end.from(currentTime)})`,
        startDateDisplay: (
          <>
            {start.format('HH:mm:ss')} <br /> <span className="text-xs text-gray-400">({start.from(currentTime)})</span>
          </>
        ),
        endDateDisplay: (
          <>
            {end.format('HH:mm:ss')} <br /> <span className="text-xs text-gray-400">({end.from(currentTime)})</span>
          </>
        ),
        durationString: formatDuration(start, end),
        workDescription: extractTextFromAtlassianDocumentFormat(log.worklog.comment),
        isTracking: false,
      };
    });

    const trackedTickets: TrackedTicket[] = Object.entries(state.trackedTickets).map(([key, value]) => {
      const start = moment(value.startTime);
      return {
        id: `tracking-${key}`,
        issue: {
          key,
          fields: {
            summary: value.summary,
          },
        },
        startDate: start.toDate(),
        startDateMoment: start,
        startDateDisplay: (
          <>
            {start.format('HH:mm:ss')} <br /> <span className="text-xs text-gray-400">({start.from(currentTime)})</span>
          </>
        ),
        durationString: formatDuration(start, currentTime),
        isTracking: true,
      };
    });

    const allLogs = [...logsWithDates, ...trackedTickets];

    if (allLogs.length === 0) {
      return {
        allLogs: [],
        groupedLogs: {},
        uniqueTickets: [],
        ticketColors: {},
        minDate: new Date(),
        maxDate: new Date(),
        maxDateMinDateDuration: 0,
        xAxisTicks: [],
        displayMode: 'grouped',
      };
    }
    const minDate = moment(selectedDate).startOf('day').toDate();
    const maxDate = moment(selectedDate).endOf('day').toDate();
    const maxDateMinDateDuration = maxDate.getTime() - minDate.getTime();
    const tickCount = 5;
    const xAxisTicks = Array.from({ length: tickCount + 1 }, (_, i) => new Date(minDate.getTime() + (maxDateMinDateDuration / tickCount) * i));
    const colors = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0', '#546E7A', '#26a69a', '#D10CE8'];
    const issueKeys = [...new Set(logsWithDates.map((log) => log.issue.key))];
    const ticketColors = issueKeys.reduce(
      (acc, key, index) => {
        acc[key] = colors[index % colors.length];
        return acc;
      },
      {} as Record<string, string>,
    );

    if (settings.displayOnNewLine) {
      return {
        allLogs,
        groupedLogs: {},
        uniqueTickets: logsWithDates.map((log) => log.id),
        ticketColors,
        minDate,
        maxDate,
        maxDateMinDateDuration,
        xAxisTicks,
        displayMode: 'individual',
      };
    }
    const groupedLogs = logsWithDates.reduce(
      (acc, log) => {
        (acc[log.issue.fields.project.key] = acc[log.issue.fields.project.key] || []).push(log);
        return acc;
      },
      {} as Record<string, ProcessedTimelog[]>,
    );
    const uniqueTickets = Object.keys(groupedLogs);
    return { allLogs, groupedLogs, uniqueTickets, ticketColors, minDate, maxDate, maxDateMinDateDuration, xAxisTicks, displayMode: 'grouped' };
  }, [jiraTimelogs, selectedDate, settings.displayOnNewLine, currentTime, state.trackedTickets]);

  const { allLogs, groupedLogs, uniqueTickets, ticketColors, minDate, maxDateMinDateDuration, xAxisTicks, displayMode } = timelineData;

  const handleRowClick = useCallback((log: ProcessedTimelog) => {
    setEditingLog(log);
    setEditModalOpen(true);
  }, []);

  const handleAddLog = useCallback((ticket: JiraTicket) => {
    setTicketForAddLog(ticket);
    setSearchModalOpen(false); // Close search modal
    setAddLogModalOpen(true); // Open add log modal
  }, []);

  const handleStartTracking = useCallback((ticket: JiraTicket) => {
    setState((currentState) => {
      const newTrackedTickets = {
        ...currentState.trackedTickets,
        [ticket.key]: {
          startTime: moment().toISOString(),
          summary: ticket.summary,
        },
      };
      return { ...currentState, trackedTickets: newTrackedTickets };
    });
  }, []);

  const handleDiscardTracking = useCallback((ticketKey: string) => {
    setState((currentState) => {
      const newTrackedTickets = { ...currentState.trackedTickets };
      delete newTrackedTickets[ticketKey];
      return { ...currentState, trackedTickets: newTrackedTickets };
    });
  }, []);

  const handleStopTracking = useCallback(
    async (ticketKey: string) => {
      if (!client || !state.trackedTickets[ticketKey]) return;

      const trackingInfo = state.trackedTickets[ticketKey];
      const startTime = moment(trackingInfo.startTime);
      const endTime = moment();
      const timeSpentSeconds = endTime.diff(startTime, 'seconds');

      if (timeSpentSeconds < 60) {
        alert('Tracked time is less than a minute. Worklog will not be submitted.');
        handleDiscardTracking(ticketKey);
        return;
      }

      try {
        await client.addWorklog(ticketKey, {
          started: startTime.toISOString(),
          timeSpentSeconds,
          comment: '',
        });
        handleDiscardTracking(ticketKey); // Remove from tracking state
        fetchWorklogs(); // Refetch to show the new log
      } catch (error) {
        console.error('Failed to submit worklog:', error);
      }
    },
    [client, state.trackedTickets, handleDiscardTracking, fetchWorklogs],
  );

  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return moment(date).format('YYYY-MM-DD');
  };

  return (
    <>
      <style>{` .timeline-grid { background-size: 20% 100%; background-image: linear-gradient(to right, #e5e7eb 1px, transparent 1px); } .dark .timeline-grid { background-image: linear-gradient(to right, #4b5563 1px, transparent 1px); } .timeline-bar { transition: all 0.2s ease-in-out; overflow: visible; } .timeline-bar:hover { z-index: 10; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); } .timeline-tooltip { visibility: hidden; opacity: 0; transition: opacity 0.2s; } .timeline-bar:hover .timeline-tooltip { visibility: visible; opacity: 1; } `}</style>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} setSettings={setSettings} />
      <EditTimelogModal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} log={editingLog} client={client} onUpdate={fetchWorklogs} />
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onAddLog={handleAddLog}
        onStartTracking={handleStartTracking}
        client={client}
      />
      <AddTimelogModal isOpen={isAddLogModalOpen} onClose={() => setAddLogModalOpen(false)} ticket={ticketForAddLog} client={client} onUpdate={fetchWorklogs} />

      <div className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto sticky top-4 z-10">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b dark:border-gray-700 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Jira Timelogs Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">For developers by developers.</p>
              </div>
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Select Date</label>
                  <input
                    type="date"
                    value={formatDateForInput(selectedDate)}
                    onChange={(e) => setSelectedDate(e.target.value ? moment(e.target.value).toDate() : new Date())}
                    className="w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                  />
                </div>
                <button
                  onClick={() => setSearchModalOpen(true)}
                  className="p-2.5 mt-5 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <SearchIcon />
                </button>
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="p-2.5 mt-5 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  <SettingsIcon />
                </button>
              </div>
            </div>

            {allLogs.length > 0 ? (
              <div className="w-full h-full text-sm">
                <div className="grid grid-cols-[150px_1fr]">
                  <div className="pr-4 border-r border-gray-200 dark:border-gray-700">
                    {displayMode === 'grouped'
                      ? uniqueTickets.map((ticketName) => (
                          <div key={ticketName} className="h-16 flex items-center font-medium text-gray-700 dark:text-gray-300 truncate">
                            {ticketName}
                          </div>
                        ))
                      : allLogs
                          .filter((log) => !log.isTracking)
                          .map((log) => (
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
                      {xAxisTicks.map((tickDate, i) => (
                        <span key={i}>{moment(tickDate).format('HH:mm')}</span>
                      ))}
                    </div>
                    <div className="relative timeline-grid">
                      {displayMode === 'grouped'
                        ? uniqueTickets.map((ticketName) => (
                            <div key={ticketName} className="h-16 relative border-b border-gray-200 dark:border-gray-700">
                              {groupedLogs[ticketName].map((log) => (
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
                            .filter((log) => !log.isTracking)
                            .map((log) => (
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
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500 dark:text-gray-400">No timelogs found for the selected date.</p>
              </div>
            )}
          </div>
        </div>

        {allLogs.length > 0 && (
          <TimelineTable
            logs={allLogs}
            hoveredLogId={hoveredLogId}
            setHoveredLogId={setHoveredLogId}
            onRowClick={handleRowClick}
            onStopTracking={handleStopTracking}
            onDiscardTracking={handleDiscardTracking}
          />
        )}

        <footer className="text-center py-8 text-gray-500 dark:text-gray-400">
          <small>
            Made with
            <span className="mx-1 text-red-500" role="img" aria-label="love">
              ❤
            </span>
            by yrambler2001
            <br />
            Copyright © 2001-2025 - All Rights Reserved
          </small>
        </footer>
      </div>
    </>
  );
}
