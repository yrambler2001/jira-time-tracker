import moment from 'moment-timezone';
import _ from 'lodash';
import type {
  JiraServerInfo,
  JiraUser,
  JiraWorklog,
  JiraWorklogPage,
  JiraIssue,
  JiraSearchResponse,
  JiraIssuePickerResponse,
  MsEpoch,
  SearchIssuesParams,
  FetchPaginatedWorklogsParams,
  JiraAuthConfig,
  JiraProject,
} from '../types/jira';

export class JiraApiClient {
  private static instance: JiraApiClient;

  private readonly email: string;
  private readonly baseUrl: string;
  private readonly myself: JiraUser;
  private readonly authHeader: string;

  private constructor(config: JiraAuthConfig, myself: JiraUser, authHeader: string) {
    this.email = config.email;
    this.baseUrl = `/proxy/${config.jiraBaseUrl}`;
    this.myself = myself;
    this.authHeader = authHeader;
  }

  public static async initialize(config: JiraAuthConfig): Promise<JiraApiClient> {
    if (!config.email || !config.apiToken || !config.jiraBaseUrl) {
      throw new Error('Jira API client requires email, apiToken, and jiraBaseUrl.');
    }

    const authHeader = `Basic ${btoa(`${config.email}:${config.apiToken}`)}`;
    const baseUrl = `/proxy/${config.jiraBaseUrl}`;

    const myself = await this._getMyself({
      authHeader,
      baseUrl,
    });

    JiraApiClient.instance = new JiraApiClient(config, myself, authHeader);
    return JiraApiClient.instance;
  }

  public static getInstance(): JiraApiClient {
    if (!JiraApiClient.instance) {
      throw new Error('JiraApiClient has not been initialized. Call JiraApiClient.initialize(config) first.');
    }
    return JiraApiClient.instance;
  }

  private static async _getMyself({ baseUrl, authHeader }: { baseUrl: string; authHeader: string }): Promise<JiraUser> {
    const url = `${baseUrl}/rest/api/3/myself`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: authHeader, Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Failed to fetch user details: ${response.status} ${await response.text()}`);
      return (await response.json()) as JiraUser;
    } catch (error) {
      console.error('Error in getMyself:', error);
      throw error;
    }
  }

  async getUserProperty(propertyKey: string): Promise<any> {
    const url = `${this.baseUrl}/rest/api/3/user/properties/${propertyKey}?accountId=${this.myself?.accountId}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: this.authHeader, Accept: 'application/json' },
      });

      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Failed to get user property: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error(`Error getting user property '${propertyKey}':`, error);
      throw error;
    }
  }

  async setUserProperty(propertyKey: string, propertyValue: any): Promise<void> {
    const url = `${this.baseUrl}/rest/api/3/user/properties/${propertyKey}?accountId=${this.myself?.accountId}`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propertyValue),
      });

      if (![200, 201].includes(response.status)) {
        throw new Error(`Failed to set user property: ${response.status} ${await response.text()}`);
      }
    } catch (error) {
      console.error(`Error setting user property '${propertyKey}':`, error);
      throw error;
    }
  }

  async addWorklog(issueIdOrKey: string, worklog: { started: string; timeSpentSeconds: number; comment?: string }): Promise<JiraWorklog> {
    const url = `${this.baseUrl}/rest/api/3/issue/${issueIdOrKey}/worklog`;
    const body: any = {
      timeSpentSeconds: worklog.timeSpentSeconds,
      started: moment(worklog.started).toISOString().replace('Z', '+0000'),
    };

    if (worklog.comment) {
      body.comment = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: worklog.comment,
              },
            ],
          },
        ],
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to add worklog: ${response.status} ${await response.text()}`);
      }
      return (await response.json()) as JiraWorklog;
    } catch (error) {
      console.error(`Error adding worklog to issue '${issueIdOrKey}':`, error);
      throw error;
    }
  }

  async updateWorklog(
    issueIdOrKey: string,
    worklogId: string,
    worklog: { started?: string; timeSpentSeconds?: number; comment?: string },
  ): Promise<JiraWorklog> {
    const url = `${this.baseUrl}/rest/api/3/issue/${issueIdOrKey}/worklog/${worklogId}`;
    const body: any = {
      timeSpentSeconds: worklog.timeSpentSeconds,
      started: moment(worklog.started).toISOString().replace('Z', '+0000'),
    };

    if (worklog.comment) {
      body.comment = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: worklog.comment,
              },
            ],
          },
        ],
      };
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to update worklog: ${response.status} ${await response.text()}`);
      }
      return (await response.json()) as JiraWorklog;
    } catch (error) {
      console.error(`Error updating worklog '${worklogId}' on issue '${issueIdOrKey}':`, error);
      throw error;
    }
  }

  async deleteWorklog(issueIdOrKey: string, worklogId: string): Promise<void> {
    const url = `${this.baseUrl}/rest/api/3/issue/${issueIdOrKey}/worklog/${worklogId}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: this.authHeader,
        },
      });

      if (response.status !== 204) {
        throw new Error(`Failed to delete worklog: ${response.status} ${await response.text()}`);
      }
    } catch (error) {
      console.error(`Error deleting worklog '${worklogId}' from issue '${issueIdOrKey}':`, error);
      throw error;
    }
  }

  async getAllProjects(): Promise<JiraProject[]> {
    const url = `${this.baseUrl}/rest/api/3/project`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: this.authHeader, Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status} ${await response.text()}`);
      }
      return (await response.json()) as JiraProject[];
    } catch (error) {
      console.error('Error in getAllProjects:', error);
      throw error;
    }
  }

  async searchIssuesByJql(jql: string, fields: string[] = ['*navigable'], maxResults: number = 50): Promise<JiraSearchResponse> {
    const url = `${this.baseUrl}/rest/api/3/search/jql`;
    const body = {
      jql,
      fields,
      maxResults,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`JQL search failed: ${response.status} ${await response.text()}`);
      }
      return (await response.json()) as JiraSearchResponse;
    } catch (error) {
      console.error('Error in searchIssuesByJql:', error);
      throw error;
    }
  }

  async findIssuesWithPicker(query: string): Promise<JiraIssuePickerResponse> {
    const url = `${this.baseUrl}/rest/api/3/issue/picker?query=${encodeURIComponent(query)}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Issue picker search failed: ${response.status} ${await response.text()}`);
      }
      return (await response.json()) as JiraIssuePickerResponse;
    } catch (error) {
      console.error('Error in findIssuesWithPicker:', error);
      throw error;
    }
  }

  private async getServerTimezone(): Promise<number> {
    const res = await fetch(`${this.baseUrl}/rest/api/3/serverInfo`, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Failed to get server info: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as JiraServerInfo;
    return moment.parseZone(json.serverTime).utcOffset();
  }

  private async searchIssues(params: SearchIssuesParams): Promise<JiraSearchResponse> {
    const { utcOffset, fetchTimelogStartedAfter, fetchTimelogStartedBefore } = params;

    const jql = `worklogAuthor = currentUser() AND worklogDate >= "${moment(fetchTimelogStartedAfter)
      .utcOffset(utcOffset)
      .format('YYYY-MM-DD')}" AND worklogDate <= "${moment(fetchTimelogStartedBefore).utcOffset(utcOffset).format('YYYY-MM-DD')}"`;

    const fields = ['assignee', 'creator', 'issuetype', 'summary', 'priority', 'project', 'reporter', 'status', 'summary', 'worklog'];

    return this.searchIssuesByJql(jql, fields, 5000);
  }

  private async fetchPaginatedWorklogs(issueId: string, params: FetchPaginatedWorklogsParams): Promise<JiraWorklog[]> {
    const { fetchTimelogStartedBefore, fetchTimelogStartedAfter } = params;
    let startAt = 0;
    const allLogs: JiraWorklog[] = [];

    while (true) {
      const url = `${this.baseUrl}/rest/api/3/issue/${issueId}/worklog?startAt=${startAt}&maxResults=5000&startedAfter=${fetchTimelogStartedAfter}&startedBefore=${fetchTimelogStartedBefore}`;
      const res = await fetch(url, {
        headers: { Authorization: this.authHeader, Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Worklog fetch failed: ${res.status} ${await res.text()}`);

      const json = (await res.json()) as JiraWorklogPage;
      allLogs.push(...json.worklogs);

      if (json.startAt + json.maxResults >= json.total) break;
      startAt += json.maxResults;
    }
    return allLogs;
  }

  private filterWorklogs(args: { worklogs: Array<{ issue: JiraIssue; worklog: JiraWorklog }>; startOfDay: moment.Moment; endOfDay: moment.Moment }) {
    const { worklogs, startOfDay, endOfDay } = args;
    return worklogs.filter(({ worklog }) => {
      if (worklog.author?.emailAddress !== this.email) return false;

      const worklogStart = moment(worklog.started);
      const worklogEnd = moment(worklogStart).add(worklog.timeSpentSeconds, 'second');

      const withinEnd = _.inRange(+worklogEnd, +startOfDay, +endOfDay);
      const withinStart = _.inRange(+worklogStart, +startOfDay, +endOfDay);
      return withinEnd || withinStart;
    });
  }

  public async getLogsForDay(day: string): Promise<Array<{ issue: JiraIssue; worklog: JiraWorklog }>> {
    const utcOffset = await this.getServerTimezone();
    const day_ = moment(day, 'YYYY-MM-DD', true);
    const startOfDay = moment(day_).startOf('day');
    const endOfDay = moment(day_).endOf('day');

    const fetchTimelogStartedBefore: MsEpoch = +moment(endOfDay).add(1, 'day');
    const fetchTimelogStartedAfter: MsEpoch = +moment(startOfDay).add(-2, 'day');

    const data = await this.searchIssues({
      utcOffset,
      fetchTimelogStartedBefore,
      fetchTimelogStartedAfter,
    });

    const flattenedWorklogs: { issue: JiraIssue; worklog: JiraWorklog }[] = [];
    for (const issue of data.issues) {
      let worklogs = issue.fields.worklog.worklogs ?? [];
      if (issue.fields.worklog.total > issue.fields.worklog.maxResults) {
        worklogs = await this.fetchPaginatedWorklogs(issue.key, {
          fetchTimelogStartedBefore,
          fetchTimelogStartedAfter,
        });
      }
      const filteredLogs = this.filterWorklogs({
        worklogs: worklogs.map((w) => ({ issue, worklog: w })),
        startOfDay,
        endOfDay,
      });
      flattenedWorklogs.push(...filteredLogs);
    }

    return _.orderBy(flattenedWorklogs, (x) => +moment(x.worklog.started));
  }
}
