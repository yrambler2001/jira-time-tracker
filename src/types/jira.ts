import moment from 'moment';

export interface JiraServerInfo {
  serverTime: string;
}

export interface JiraUserRef {
  emailAddress?: string;
}

export interface JiraUser {
  self: string;
  accountId: string;
  emailAddress: string;
  avatarUrls: Record<string, string>;
  displayName: string;
  active: boolean;
  timeZone: string;
  locale: string;
}

export interface JiraWorklog {
  id: string;
  started: string;
  timeSpentSeconds: number;
  author?: JiraUserRef;
  comment?: {
    type: 'doc';
    version: 1;
    content: {
      type: 'paragraph';
      content: {
        type: 'text';
        text: string;
      }[];
    }[];
  };
}

export interface JiraWorklogPage {
  startAt: number;
  maxResults: number;
  total: number;
  worklogs: JiraWorklog[];
}

export interface JiraIssueFields {
  summary?: string;
  worklog: {
    total: number;
    maxResults: number;
    worklogs: JiraWorklog[];
  };
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: JiraIssueFields;
}

export interface JiraSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraIssuePickerIssue {
  key: string;
  keyHtml: string;
  summary: string;
  summaryText: string;
}

export interface JiraIssuePickerSection {
  label: string;
  sub: string;
  id: string;
  issues: JiraIssuePickerIssue[];
}

export interface JiraIssuePickerResponse {
  sections: JiraIssuePickerSection[];
}

export type MsEpoch = number;

export interface SearchIssuesParams {
  utcOffset: number;
  fetchTimelogStartedAfter: MsEpoch;
  fetchTimelogStartedBefore: MsEpoch;
}

export interface FetchPaginatedWorklogsParams {
  fetchTimelogStartedBefore: MsEpoch;
  fetchTimelogStartedAfter: MsEpoch;
}

export interface JiraAuthConfig {
  email: string;
  apiToken: string;
  jiraBaseUrl: string;
}

export interface JiraTimelog {
  start_date: string;
  end_date: string;
  jira_ticket_id: string;
  jira_ticket_name: string;
  [key: string]: any;
}

export interface ProcessedTimelog extends JiraTimelog {
  id: string;
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

export interface JiraAccount {
  id: string;
  jiraToken: string;
  email: string;
  jiraSubdomain: string;
}

export interface Settings {
  accounts: JiraAccount[];
  activeAccount: string;
  displayOnNewLine: boolean;
  isHeaderNonFloating: boolean;
  theme: Theme;
  version?: number;
}

export type Theme = 'light' | 'dark' | 'system';

export interface JiraTicket {
  key: string;
  summary: string;
  self?: string;
}

export interface TrackedTicket {
  id: string;
  issue: {
    key: string;
    fields: {
      summary: string;
    };
    self?: string;
  };
  startDate: Date;
  startDateMoment: moment.Moment;
  startDateDisplay: React.ReactNode;
  durationString: string;
  workDescription: string;
  isTracking: true;
}

export interface State {
  trackedTickets: {
    [id: string]: {
      key: string;
      startTime: string;
      summary: string;
      self?: string;
      workDescription?: string;
    };
  };
  starredTickets: string[];
  isDefault?: boolean;
  version?: number;
}
