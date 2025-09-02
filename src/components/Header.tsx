import React from 'react';
import moment from 'moment';
import { SettingsIcon, SearchIcon } from './Icons';
import Timeline from './Timeline';
import type { ProcessedTimelog } from '../types/jira';
import { formatTotalSeconds } from '../utils/time';

interface HeaderProps {
  totalTrackedTodayInSeconds: number;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  setSearchModalOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  // Props for Timeline
  timelineData: any;
  hoveredLogId: string | null;
  setHoveredLogId: (id: string | null) => void;
  handleRowClick: (log: ProcessedTimelog) => void;
}

const Header: React.FC<HeaderProps> = ({
  totalTrackedTodayInSeconds,
  selectedDate,
  setSelectedDate,
  setSearchModalOpen,
  setSettingsOpen,
  timelineData,
  hoveredLogId,
  setHoveredLogId,
  handleRowClick,
}) => {
  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return moment(date).format('YYYY-MM-DD');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <div className="flex justify-between items-start sm:items-center mb-6 border-b dark:border-gray-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Jira Timelogs Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">For developers by developers.</p>
        </div>
        <div className="flex items-end gap-4">
          <div className="text-right">
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Total for Day</label>
            <div className="p-2 font-bold text-lg text-gray-800 dark:text-white">{formatTotalSeconds(totalTrackedTodayInSeconds)}</div>
          </div>
          <div className="overflow-hidden">
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Select Date</label>
            <input
              type="date"
              value={formatDateForInput(selectedDate)}
              onChange={(e) => setSelectedDate(e.target.value ? moment(e.target.value).toDate() : new Date())}
              className="w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
            />
          </div>
          <button onClick={() => setSearchModalOpen(true)} className="p-2.5 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
            <SearchIcon />
          </button>
          <button onClick={() => setSettingsOpen(true)} className="p-2.5 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
            <SettingsIcon />
          </button>
        </div>
      </div>

      {timelineData.allLogs.length > 0 ? (
        <Timeline timelineData={timelineData} hoveredLogId={hoveredLogId} setHoveredLogId={setHoveredLogId} handleRowClick={handleRowClick} />
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">No timelogs found for the selected date.</p>
          <p className="text-sm text-gray-400 mt-2">Use the search to start tracking or add a log.</p>
        </div>
      )}
    </div>
  );
};

export default Header;
