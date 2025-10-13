import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { parseDurationToSeconds, formatSecondsToDuration } from '../utils/time';
import { CalculatorIcon } from './Icons';

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
  isSubmitting?: boolean;
}

const TimelogForm: React.FC<TimelogFormProps> = ({ initialData, onSave, onDelete, buttonText, isSubmitting = false }) => {
  const [startTime, setStartTime] = useState(initialData.startDateMoment.format('YYYY-MM-DD HH:mm:ss'));
  const [endTime, setEndTime] = useState(initialData.endDateMoment.format('YYYY-MM-DD HH:mm:ss'));
  const [duration, setDuration] = useState(initialData.durationString);
  const [description, setDescription] = useState(initialData.description);
  const [autoCalcField, setAutoCalcField] = useState<AutoCalcField>('duration');
  const [lastEdited, setLastEdited] = useState<AutoCalcField | null>(null);

  useEffect(() => {
    // Recalculate fields when the auto-calc field changes or initial data is updated
    const startMoment = moment(startTime, 'YYYY-MM-DD HH:mm:ss');
    const endMoment = moment(endTime, 'YYYY-MM-DD HH:mm:ss');
    const durationSeconds = parseDurationToSeconds(duration);

    if (!startMoment.isValid() || !endMoment.isValid() || !lastEdited) return;

    if (autoCalcField === 'start') {
      const newStart = endMoment.clone().subtract(durationSeconds, 'seconds');
      if (newStart.isValid()) {
        setStartTime(newStart.format('YYYY-MM-DD HH:mm:ss'));
      }
    } else if (autoCalcField === 'end') {
      const newEnd = startMoment.clone().add(durationSeconds, 'seconds');
      if (newEnd.isValid()) {
        setEndTime(newEnd.format('YYYY-MM-DD HH:mm:ss'));
      }
    } else if (autoCalcField === 'duration') {
      if (endMoment.isAfter(startMoment)) {
        const newDuration = moment.duration(endMoment.diff(startMoment)).asSeconds();
        setDuration(formatSecondsToDuration(newDuration));
      }
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
      aria-label={`Automatically calculate ${field}`}
    >
      <CalculatorIcon />
    </button>
  );

  const getInputClass = (field: AutoCalcField) => {
    const baseClass = 'block w-full p-2 border rounded-md dark:border-gray-600 dark:text-gray-300';
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
        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-auto disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : buttonText}
        </button>
      </div>
    </div>
  );
};

export default TimelogForm;
