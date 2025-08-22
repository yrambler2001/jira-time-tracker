import moment from 'moment-timezone';
import _ from 'lodash';

// --- Types (minimal but practical) ---

interface JiraServerInfo {
  serverTime: string; // ISO string with offset (e.g., "2025-08-22T01:23:45.678+0000")
}

interface JiraUserRef {
  emailAddress?: string;
  // add fields here if needed
}

interface JiraWorklog {
  id: string;
  started: string; // ISO string
  timeSpentSeconds: number;
  author?: JiraUserRef;
  // add fields here if needed
}

interface JiraWorklogPage {
  startAt: number;
  maxResults: number;
  total: number;
  worklogs: JiraWorklog[];
}

interface JiraIssueFields {
  summary?: string;
  worklog: {
    total: number;
    maxResults: number;
    worklogs: JiraWorklog[];
  };
  // add any other fields you actually use
}

interface JiraIssue {
  id: string;
  key: string;
  fields: JiraIssueFields;
}

interface JiraSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

type MsEpoch = number;

interface SearchIssuesParams {
  utcOffset: number; // in minutes
  fetchTimelogStartedAfter: MsEpoch;
  fetchTimelogStartedBefore: MsEpoch;
}

interface FetchPaginatedWorklogsParams {
  fetchTimelogStartedBefore: MsEpoch;
  fetchTimelogStartedAfter: MsEpoch;
}

export const getLogsForDay = async ({ day, email, apiToken }: { day: string; email: string; apiToken: string }) => {
  const JIRA_BASE = '/test1';
  const auth = `Basic ${btoa(`${email}:${apiToken}`)}`;

  const getServerTimezone = async (): Promise<number> => {
    const res = await fetch(`${JIRA_BASE}/rest/api/3/serverInfo`, {
      method: 'GET',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to get server info: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as JiraServerInfo;
    const m = moment.parseZone(json.serverTime);
    const utcOffset = m.utcOffset(); // minutes
    // console.log(`Jira server timezone is UTC${m.format('Z')}; UTC Offset ${utcOffset}`);
    return utcOffset;
  };

  async function searchIssues(params: SearchIssuesParams): Promise<JiraSearchResponse> {
    const { utcOffset, fetchTimelogStartedAfter, fetchTimelogStartedBefore } = params;
    const url = `${JIRA_BASE}/rest/api/3/search/jql`;
    const body = {
      jql: `worklogAuthor = currentUser() AND worklogDate >= "${moment(fetchTimelogStartedAfter)
        .utcOffset(utcOffset)
        .format('YYYY-MM-DD')}" AND worklogDate <= "${moment(fetchTimelogStartedBefore).utcOffset(utcOffset).format('YYYY-MM-DD')}"`,
      fields: [
        'customfield_10124',
        'customfield_10075',
        'versions',
        'assignee',
        'customfield_10092',
        'customfield_10100',
        'customfield_10146',
        'customfield_10007',
        'customfield_10006',
        'customfield_10005',
        'customfield_10058',
        'components',
        'customfield_10120',
        'creator',
        'customfield_10141',
        'customfield_10123',
        'customfield_10106',
        'customfield_10013',
        'customfield_10014',
        'customfield_10011',
        'fixVersions',
        'customfield_10023',
        'customfield_10134',
        'customfield_10158',
        'customfield_10149',
        'customfield_10004',
        'customfield_10086',
        'customfield_10093',
        'issuetype',
        'issuekey',
        'labels',
        'customfield_10118',
        'customfield_10257',
        'customfield_10071',
        'customfield_10002',
        'customfield_10072',
        'priority',
        'customfield_10152',
        'customfield_10069',
        'project',
        'reporter',
        'resolution',
        'customfield_10135',
        'customfield_10078',
        'customfield_10080',
        'customfield_10108',
        'customfield_10119',
        'customfield_10021',
        'status',
        'summary',
        'customfield_10139',
        'customfield_10073',
        'customfield_10121',
        'customfield_10101',
        'customfield_10191',
        '__projectName',
        '__workTag',
        '__statusCategory',
        'parent',
        'worklog',
      ],
      maxResults: 5000,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`JQL search failed: ${res.status} ${await res.text()}`);
    const response = (await res.json()) as JiraSearchResponse;
    return response;
  }

  async function fetchPaginatedWorklogs(issueId: string, params: FetchPaginatedWorklogsParams): Promise<JiraWorklog[]> {
    const { fetchTimelogStartedBefore, fetchTimelogStartedAfter } = params;
    let startAt = 0;
    const allLogs: JiraWorklog[] = [];

    // The worklog endpoint supports "startedAfter/Before" in milliseconds since epoch.
    while (true) {
      const url = `${JIRA_BASE}/rest/api/3/issue/${issueId}/worklog?startAt=${startAt}&maxResults=5000&startedAfter=${fetchTimelogStartedAfter}&startedBefore=${fetchTimelogStartedBefore}`;
      const res = await fetch(url, {
        headers: { Authorization: auth, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Worklog fetch failed: ${res.status} ${await res.text()}`);

      const json = (await res.json()) as JiraWorklogPage;
      allLogs.push(...json.worklogs);

      if (json.startAt + json.maxResults >= json.total) break;
      startAt += json.maxResults;
    }
    return allLogs;
  }

  function filterWorklogs(args: { worklogs: Array<{ issue: JiraIssue; worklog: JiraWorklog }>; startOfDay: moment.Moment; endOfDay: moment.Moment }) {
    const { worklogs, startOfDay, endOfDay } = args;

    return worklogs.filter(({ worklog }) => {
      // keep only current user's logs
      if (worklog.author?.emailAddress !== email) return false;

      const worklogStart = moment(worklog.started);
      const worklogEnd = moment(worklogStart).add(worklog.timeSpentSeconds, 'second');

      // overlap test: either start or end falls within [startOfDay, endOfDay)
      const withinEnd = _.inRange(+worklogEnd, +startOfDay, +endOfDay);
      const withinStart = _.inRange(+worklogStart, +startOfDay, +endOfDay);
      return withinEnd || withinStart;
    });
  }

  // --- Server ---

  const utcOffset = await getServerTimezone();

  const dayStr: string = day;

  // console.log('fetching day:', dayStr);

  const day_ = moment(dayStr, 'YYYY-MM-DD', true);

  const startOfDay = moment(day_).startOf('day');
  const endOfDay = moment(day_).endOf('day');

  // Jira "startedAfter/Before" expect ms epoch
  const fetchTimelogStartedBefore: MsEpoch = +moment(endOfDay).add(1, 'day');
  const fetchTimelogStartedAfter: MsEpoch = +moment(startOfDay).add(-2, 'day');

  const data = await searchIssues({
    utcOffset,
    fetchTimelogStartedBefore,
    fetchTimelogStartedAfter,
  });
  const wl: Array<{ issue: JiraIssue; worklog: JiraWorklog }> = [];

  for (const issue of data.issues) {
    const initial = issue.fields.worklog.worklogs ?? [];
    let worklogs: JiraWorklog[] = initial;

    if (issue.fields.worklog.total > issue.fields.worklog.maxResults) {
      // console.log('loading paginated worklogs for ticket', issue.key);
      worklogs = await fetchPaginatedWorklogs(issue.id, {
        fetchTimelogStartedBefore,
        fetchTimelogStartedAfter,
      });
    }

    const filtered = filterWorklogs({
      worklogs: worklogs.map((w) => ({ issue, worklog: w })),
      startOfDay,
      endOfDay,
    });
    wl.push(...filtered);
  }

  const ordered = _.orderBy(wl, (x) => +moment(x.worklog.started));
  return ordered;
};
