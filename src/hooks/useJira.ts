import { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import { JiraApiClient } from '../services/jira';
import type { Settings, State } from '../types/jira';
import { JIRA_PROPERTY_KEY, parseState, stringifyState } from '../utils/jira';

type StateUpdater = (currentState: State) => State;

const updateJiraStateAtomically = async (client: JiraApiClient, updater: StateUpdater): Promise<State> => {
  try {
    const currentStateText = await client.getUserProperty(JIRA_PROPERTY_KEY);
    const currentState = parseState(currentStateText);
    const newState = updater(currentState);
    const newStateText = stringifyState(newState);
    await client.setUserProperty(JIRA_PROPERTY_KEY, newStateText);
    return newState;
  } catch (error) {
    console.error('Failed to update Jira state atomically:', error);
    const currentStateText = await client.getUserProperty(JIRA_PROPERTY_KEY);
    return parseState(currentStateText);
  }
};

const useJira = (settings: Settings) => {
  const [client, setClient] = useState<JiraApiClient | null>(null);
  const [state, setState] = useState<State>({ trackedTickets: {}, starredTickets: [], isDefault: true });
  const [backendData, setBackendData] = useState<any>(undefined);

  useEffect(() => {
    if (!settings.email || !settings.jiraToken || !settings.jiraSubdomain) return;
    JiraApiClient.initialize({
      email: settings.email,
      apiToken: settings.jiraToken,
      jiraBaseUrl: settings.jiraSubdomain,
    }).then(async (client) => {
      setClient(client);
      const stateText = await client.getUserProperty(JIRA_PROPERTY_KEY);
      const parsedState = parseState(stateText);
      setState(parsedState);
    });
  }, [settings?.email, settings?.jiraToken, settings?.jiraSubdomain]);

  const fetchWorklogs = useCallback(
    (selectedDate: Date) => {
      if (!client) return;
      client
        .getLogsForDay(moment(selectedDate).format('YYYY-MM-DD'))
        .then((data) => {
          setBackendData(data);
        })
        .catch((err) => console.error('Failed to fetch logs:', err));
    },
    [client],
  );

  const updateState = async (updater: StateUpdater) => {
    if (!client) return;
    const newState = await updateJiraStateAtomically(client, updater);
    setState(newState);
  };

  return { client, state, backendData, fetchWorklogs, updateState };
};

export default useJira;
