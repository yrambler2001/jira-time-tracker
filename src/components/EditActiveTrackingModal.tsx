import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { TrackedTicket } from '../types/jira';

interface EditActiveTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: TrackedTicket | null;
  onSave: (id: string, updates: { startTime: string; workDescription: string }) => void;
}

const EditActiveTrackingModal: React.FC<EditActiveTrackingModalProps> = ({ isOpen, onClose, log, onSave }) => {
  const [startTime, setStartTime] = useState('');
  const [workDescription, setWorkDescription] = useState('');

  useEffect(() => {
    if (log) {
      setStartTime(log.startDateMoment.format('YYYY-MM-DD HH:mm:ss'));
      setWorkDescription(log.workDescription || '');
    }
  }, [log, isOpen]);

  if (!log) return null;

  const handleSave = () => {
    onSave(log.id, { startTime, workDescription });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Tracking for ${log.issue.key}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time (YYYY-MM-DD HH:mm:ss)</label>
          <input
            type="text"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 block w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Work Description</label>
          <textarea
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            rows={4}
            className="mt-1 block w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
          />
        </div>
        <div className="flex justify-end pt-4">
          <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditActiveTrackingModal;
