import React from 'react';
import moment from 'moment';
import Modal from './Modal';
import TimelogForm from './TimelogForm';
import type { JiraTicket } from '../types/jira';
import { JiraApiClient } from '../services/jira';
import useDebounceClick from '../hooks/useDebounceClick';

interface AddTimelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: JiraTicket | null;
  client: JiraApiClient | null;
  onUpdate: () => void;
}

const AddTimelogModal: React.FC<AddTimelogModalProps> = ({ isOpen, onClose, ticket, client, onUpdate }) => {
  const { isWaitingForPreviousClickAction, isWaitingForPreviousClickActionRef, onClickActionStarted, onClickActionCompleted } = useDebounceClick();

  if (!ticket || !client) return null;

  const initialData = {
    startDateMoment: moment().subtract(10, 'minutes'),
    endDateMoment: moment(),
    durationString: '10m',
    description: '',
  };

  const handleSave = async (data: any) => {
    if (isWaitingForPreviousClickActionRef.current) return;
    onClickActionStarted();
    try {
      await client.addWorklog(ticket.key, data);
      onUpdate();
    } catch (error) {
      console.error('Failed to add worklog:', error);
      // Optionally show an error message to the user
      onClickActionCompleted();
    }
    onClose();
    setTimeout(() => onClickActionCompleted(), 1000 /* waiting for close modal animation */);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Timelog for ${ticket.key}`}>
      <TimelogForm initialData={initialData} onSave={handleSave} buttonText="Add Timelog" isSubmitting={isWaitingForPreviousClickAction} />
    </Modal>
  );
};

export default AddTimelogModal;
