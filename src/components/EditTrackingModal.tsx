import React from 'react';
import moment from 'moment';
import Modal from './Modal';
import TimelogForm from './TimelogForm';
import { JiraApiClient } from '../services/jira';
import { formatSecondsToDuration } from '../utils/time';
import useDebounceClick from '../hooks/useDebounceClick';

interface EditTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingInfo: { id: string; key: string; summary: string; startTime: string; workDescription: string } | null;
  client: JiraApiClient | null;
  onUpdate: () => void;
  onDiscard: (id: string) => void;
}

const EditTrackingModal: React.FC<EditTrackingModalProps> = ({ isOpen, onClose, trackingInfo, client, onUpdate, onDiscard }) => {
  const { isWaitingForPreviousClickAction, isWaitingForPreviousClickActionRef, onClickActionStarted, onClickActionCompleted } = useDebounceClick();

  if (!trackingInfo || !client) return null;

  const startMoment = moment(trackingInfo.startTime);
  const endMoment = moment();
  const durationInSeconds = endMoment.diff(startMoment, 'seconds');

  const initialData = {
    startDateMoment: startMoment,
    endDateMoment: endMoment,
    durationString: formatSecondsToDuration(durationInSeconds),
    description: trackingInfo.workDescription || '',
  };

  const handleSave = async (data: any) => {
    if (isWaitingForPreviousClickActionRef.current) return;
    onClickActionStarted();
    try {
      await client.addWorklog(trackingInfo.key, data);
      onUpdate();
    } catch (error) {
      console.error('Failed to add worklog:', error);
      onClickActionCompleted();
    }
    onClose();
    setTimeout(() => onClickActionCompleted(), 1000 /* waiting for close modal animation */);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Submit Time for ${trackingInfo.key}`}>
      <TimelogForm
        initialData={initialData}
        onSave={handleSave}
        onDelete={() => {
          onDiscard(trackingInfo.id);
          onClose();
        }}
        buttonText="Submit Timelog"
        isSubmitting={isWaitingForPreviousClickAction}
      />
    </Modal>
  );
};

export default EditTrackingModal;
