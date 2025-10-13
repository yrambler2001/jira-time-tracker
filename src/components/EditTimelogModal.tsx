import React from 'react';
import Modal from './Modal';
import TimelogForm from './TimelogForm';
import type { ProcessedTimelog } from '../types/jira';
import { JiraApiClient } from '../services/jira';
import { formatSecondsToDuration } from '../utils/time';
import useDebounceClick from '../hooks/useDebounceClick';

interface EditTimelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: ProcessedTimelog | null;
  client: JiraApiClient | null;
  onUpdate: () => void;
  onDeleteRequest: (log: ProcessedTimelog) => void;
}

const EditTimelogModal: React.FC<EditTimelogModalProps> = ({ isOpen, onClose, log, client, onUpdate, onDeleteRequest }) => {
  const { isWaitingForPreviousClickAction, isWaitingForPreviousClickActionRef, onClickActionStarted, onClickActionCompleted } = useDebounceClick();

  if (!log || !client) return null;

  const initialData = {
    startDateMoment: log.startDateMoment,
    endDateMoment: log.endDateMoment,
    durationString: formatSecondsToDuration(log.worklog.timeSpentSeconds),
    description: log.workDescription || '',
  };

  const handleSave = async (data: any) => {
    if (isWaitingForPreviousClickActionRef.current) return;
    onClickActionStarted();
    try {
      await client.updateWorklog(log.issue.key, log.id, data);
      onUpdate();
    } catch (error) {
      console.error('Failed to update worklog:', error);
      onClickActionCompleted();
    }
    onClose();
    setTimeout(() => onClickActionCompleted(), 1000 /* waiting for close modal animation */);
  };

  const handleDelete = () => {
    onDeleteRequest(log);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Timelog for ${log.issue.key}`}>
      <TimelogForm
        initialData={initialData}
        onSave={handleSave}
        onDelete={handleDelete}
        buttonText="Update Timelog"
        isSubmitting={isWaitingForPreviousClickAction}
      />
    </Modal>
  );
};

export default EditTimelogModal;
