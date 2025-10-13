import { useCallback, useRef, useState } from 'react';

const useDebounceClick = () => {
  const isWaitingForPreviousClickActionRef = useRef(false);
  const [isWaitingForPreviousClickAction, setIsWaitingForPreviousClickAction] = useState(false);

  const onClickActionStarted = useCallback(() => {
    isWaitingForPreviousClickActionRef.current = true;
    setIsWaitingForPreviousClickAction(true);
  }, []);
  const onClickActionCompleted = useCallback(() => {
    isWaitingForPreviousClickActionRef.current = false;
    setIsWaitingForPreviousClickAction(false);
  }, []);

  return {
    isWaitingForPreviousClickAction,
    isWaitingForPreviousClickActionRef,
    onClickActionStarted,
    onClickActionCompleted,
  };
};
export default useDebounceClick;
