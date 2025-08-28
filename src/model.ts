import moment from 'moment-timezone';
import _ from 'lodash';

// --- Types (minimal but practical) ---

interface JiraServerInfo {
  serverTime: string; // ISO string with offset (e.g., "2025-08-22T01:23:45.678+0000")
}

interface JiraUserRef {
  emailAddress?: string;
}

// Added a more detailed User interface for the getMyself method
interface JiraUser {
  self: string;
  accountId: string;
  emailAddress: string;
  avatarUrls: Record<string, string>;
  displayName: string;
  active: boolean;
  timeZone: string;
  locale: string;
}

interface JiraWorklog {
  id: string;
  started: string;
  timeSpentSeconds: number;
  author?: JiraUserRef;
  // Add comment field for creation/update
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

// Interface for the Issue Picker response
interface JiraIssuePickerIssue {
  key: string;
  keyHtml: string;
  summary: string;
  summaryText: string;
}

interface JiraIssuePickerSection {
  label: string;
  sub: string;
  id: string;
  issues: JiraIssuePickerIssue[];
}

interface JiraIssuePickerResponse {
  sections: JiraIssuePickerSection[];
}

type MsEpoch = number;

interface SearchIssuesParams {
  utcOffset: number;
  fetchTimelogStartedAfter: MsEpoch;
  fetchTimelogStartedBefore: MsEpoch;
}

interface FetchPaginatedWorklogsParams {
  fetchTimelogStartedBefore: MsEpoch;
  fetchTimelogStartedAfter: MsEpoch;
}

/**
 * Configuration for the Jira API Client.
 */
export interface JiraAuthConfig {
  email: string;
  apiToken: string;
  jiraBaseUrl: string;
}

/**
 * A client for interacting with the Jira Cloud REST API, containing all related logic.
 */
export class JiraApiClient {
  private static instance: JiraApiClient;

  // Properties are now 'readonly' as they are set once at initialization.
  private readonly email: string;
  private readonly baseUrl: string;
  private readonly myself: JiraUser;
  private readonly authHeader: string;

  // The constructor is private to prevent direct instantiation.
  private constructor(config: JiraAuthConfig, myself: JiraUser, authHeader: string) {
    this.email = config.email;
    this.baseUrl = config.jiraBaseUrl;
    this.myself = myself;
    this.authHeader = authHeader;
  }

  /**
   * Initializes the singleton instance of the API client.
   * This method must be called before getInstance() can be used.
   * @param config - The authentication configuration.
   * @returns The initialized Jira API client instance.
   */
  public static async initialize(config: JiraAuthConfig): Promise<JiraApiClient> {
    // if (JiraApiClient.instance) {
    //   // Or you could just return the existing instance
    //   console.warn("JiraApiClient is already initialized. Re-initializing...");
    // }

    if (!config.email || !config.apiToken || !config.jiraBaseUrl) {
      throw new Error('Jira API client requires email, apiToken, and jiraBaseUrl.');
    }

    const authHeader = `Basic ${btoa(`${config.email}:${config.apiToken}`)}`;

    const myself = await this._getMyself({
      authHeader,
      baseUrl: config.jiraBaseUrl,
    });

    // Create and store the singleton instance
    JiraApiClient.instance = new JiraApiClient(config, myself, authHeader);
    return JiraApiClient.instance;
  }

  /**
   * Returns the singleton instance of the API client.
   * Throws an error if the client has not been initialized.
   * @returns The singleton Jira API client instance.
   */
  public static getInstance(): JiraApiClient {
    if (!JiraApiClient.instance) {
      throw new Error('JiraApiClient has not been initialized. Call JiraApiClient.initialize(config) first.');
    }
    return JiraApiClient.instance;
  }

  /**
   * Fetches the details for the currently authenticated user.
   * @returns A promise that resolves with the user's details.
   */
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

  /**
   * Retrieves a preference for the current user.
   * @param key - The key of the preference to retrieve.
   * @returns A promise that resolves to the value of the preference.
   */
  async getUserPreference(key: string): Promise<any> {
    const url = `${this.baseUrl}/rest/api/3/mypreferences?key=${key}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: this.authHeader, Accept: 'application/json' },
      });
      if (response.status === 404) return null; // Preference not set
      if (!response.ok) throw new Error(`Failed to get preference: ${response.status} ${await response.text()}`);
      return await response.json();
    } catch (error) {
      console.error(`Error getting preference '${key}':`, error);
      throw error;
    }
  }

  /**
   * Sets a preference for the current user.
   * @param key - The key of the preference to set.
   * @param value - The value to set for the preference.
   */
  async setUserPreference(key: string, value: any): Promise<void> {
    const url = `${this.baseUrl}/rest/api/3/mypreferences?key=${key}`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });
      // A successful response is 204 No Content
      if (response.status !== 204) {
        throw new Error(`Failed to set preference: ${response.status} ${await response.text()}`);
      }
      console.log(`Preference '${key}' set successfully.`);
    } catch (error) {
      console.error(`Error setting preference '${key}':`, error);
      throw error;
    }
  }

  /**
   * Retrieves a property for the current user.
   * @param propertyKey - The key of the property to retrieve.
   * @returns A promise that resolves with the property's value, or null if not found.
   */
  async getUserProperty(propertyKey: string): Promise<any> {
    const url = `${this.baseUrl}/rest/api/3/user/properties/${propertyKey}?accountId=${this.myself?.accountId}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: this.authHeader, Accept: 'application/json' },
      });

      if (response.status === 404) return null; // Property not set
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

  /**
   * Sets a property for the current user.
   * @param propertyKey - The key of the property to set.
   * @param propertyValue - The value to set for the property.
   * @returns A promise that resolves when the property is successfully set.
   */
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
      console.log(`User property '${propertyKey}' set successfully.`);
    } catch (error) {
      console.error(`Error setting user property '${propertyKey}':`, error);
      throw error;
    }
  }

  /**
   * Fetches all properties for the current user.
   * @returns A promise that resolves with an object containing all the user's properties.
   */
  async getAllUserProperties(): Promise<Record<string, any>> {
    console.log(`Fetching all properties for the current user.`);
    const propertiesUrl = `${this.baseUrl}/rest/api/3/user/properties?accountId=${this.myself?.accountId}`;

    try {
      const keysResponse = await fetch(propertiesUrl, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!keysResponse.ok) {
        const errorText = await keysResponse.text();
        throw new Error(`Failed to fetch user property keys: ${keysResponse.status} ${errorText}`);
      }

      const { keys } = (await keysResponse.json()) as {
        keys: { key: string }[];
      };
      if (!keys || keys.length === 0) {
        console.log(`No properties found for the current user.`);
        return {};
      }

      const propertyPromises = keys.map((prop) => this.getUserProperty(prop.key));
      const propertyValues = await Promise.all(propertyPromises);

      const allProperties: Record<string, any> = {};
      keys.forEach((prop, index) => {
        allProperties[prop.key] = propertyValues[index];
      });

      console.log(`Successfully fetched all properties for the current user:`, allProperties);
      return allProperties;
    } catch (error) {
      console.error('Error in getAllUserProperties:', error);
      throw error;
    }
  }

  /**
   * Fetches all non-visible properties of a specific Jira ticket.
   * @param ticketKey - The key of the ticket to fetch properties from (e.g., "AB-1").
   * @returns A promise that resolves with an object containing all the ticket's properties.
   */
  async getTicketProperties(ticketKey: string): Promise<Record<string, any>> {
    console.log(`Fetching all properties for ticket: ${ticketKey}`);
    const propertiesUrl = `${this.baseUrl}/rest/api/3/issue/${ticketKey}/properties`;

    try {
      const keysResponse = await fetch(propertiesUrl, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!keysResponse.ok) {
        const errorText = await keysResponse.text();
        throw new Error(`Failed to fetch property keys for ${ticketKey}: ${keysResponse.status} ${errorText}`);
      }

      const { keys } = (await keysResponse.json()) as {
        keys: { key: string }[];
      };
      if (!keys || keys.length === 0) {
        console.log(`No properties found for ticket ${ticketKey}.`);
        return {};
      }

      const propertyPromises = keys.map((prop) => this.getTicketProperty(ticketKey, prop.key));
      const propertyValues = await Promise.all(propertyPromises);

      const allProperties: Record<string, any> = {};
      keys.forEach((prop, index) => {
        allProperties[prop.key] = propertyValues[index];
      });

      console.log(`Successfully fetched all properties for ticket ${ticketKey}:`, allProperties);
      return allProperties;
    } catch (error) {
      console.error('Error in getTicketProperties:', error);
      throw error;
    }
  }

  /**
   * Updates a visible property on a Jira ticket.
   * @param ticketKey - The key of the ticket to update (e.g., "AB-1").
   * @param updateData - The data to update. For example, to update the summary: { fields: { summary: "New summary" } }.
   * @returns A promise that resolves when the ticket is successfully updated.
   */
  async updateTicket(ticketKey: string, updateData: object): Promise<void> {
    console.log(`Updating ticket: ${ticketKey} with data:`, updateData);
    const url = `${this.baseUrl}/rest/api/3/issue/${ticketKey}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.status === 204) {
        console.log(`Ticket ${ticketKey} updated successfully.`);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update ticket ${ticketKey}: ${response.status} ${errorText}`);
      }

      console.log(`Ticket ${ticketKey} updated successfully.`);
    } catch (error) {
      console.error('Error in updateTicket:', error);
      throw error;
    }
  }

  /**
   * Gets a non-visible entity property of an issue.
   * @param ticketKey - The key of the ticket (e.g., "AB-1").
   * @param propertyKey - The key of the property to retrieve (e.g., "com.my.app.data").
   * @returns A promise that resolves with the property's value.
   */
  async getTicketProperty(ticketKey: string, propertyKey: string): Promise<any> {
    const url = `${this.baseUrl}/rest/api/3/issue/${ticketKey}/properties/${propertyKey}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: this.authHeader, Accept: 'application/json' },
      });

      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Failed to get property: ${response.status} ${await response.text()}`);

      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error(`Error getting property '${propertyKey}':`, error);
      throw error;
    }
  }

  /**
   * Sets a non-visible entity property on an issue.
   * @param ticketKey - The key of the ticket (e.g., "AB-1").
   * @param propertyKey - The key of the property to set (e.g., "com.my.app.data").
   * @param propertyValue - The value to store. This can be any JSON-serializable object.
   * @returns A promise that resolves when the property is successfully set.
   */
  async setTicketProperty(ticketKey: string, propertyKey: string, propertyValue: any): Promise<void> {
    const url = `${this.baseUrl}/rest/api/3/issue/${ticketKey}/properties/${propertyKey}`;
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
        throw new Error(`Failed to set property: ${response.status} ${await response.text()}`);
      }
    } catch (error) {
      console.error(`Error setting property '${propertyKey}':`, error);
      throw error;
    }
  }

  // --- NEW WORKLOG METHODS ---

  /**
   * Adds a worklog to an issue.
   * @param issueIdOrKey The ID or key of the issue.
   * @param worklog The worklog data to add.
   * @returns The created worklog.
   */
  async addWorklog(issueIdOrKey: string, worklog: { started: string; timeSpentSeconds: number; comment?: string }): Promise<JiraWorklog> {
    const url = `${this.baseUrl}/rest/api/3/issue/${issueIdOrKey}/worklog`;
    const body: any = {
      timeSpentSeconds: worklog.timeSpentSeconds,
      started: worklog.started,
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

  /**
   * Updates an existing worklog.
   * @param issueIdOrKey The ID or key of the issue.
   * @param worklogId The ID of the worklog to update.
   * @param worklog The worklog data to update.
   * @returns The updated worklog.
   */
  async updateWorklog(
    issueIdOrKey: string,
    worklogId: string,
    worklog: { started?: string; timeSpentSeconds?: number; comment?: string },
  ): Promise<JiraWorklog> {
    const url = `${this.baseUrl}/rest/api/3/issue/${issueIdOrKey}/worklog/${worklogId}`;
    const body: any = {
      timeSpentSeconds: worklog.timeSpentSeconds,
      started: worklog.started,
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

  /**
   * Deletes a worklog from an issue.
   * @param issueIdOrKey The ID or key of the issue.
   * @param worklogId The ID of the worklog to delete.
   */
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
      console.log(`Worklog '${worklogId}' deleted successfully from issue '${issueIdOrKey}'.`);
    } catch (error) {
      console.error(`Error deleting worklog '${worklogId}' from issue '${issueIdOrKey}':`, error);
      throw error;
    }
  }

  // --- NEW SEARCH METHODS ---

  /**
   * Searches for issues using a JQL query.
   * @param jql The JQL query string.
   * @param fields Optional array of fields to return for each issue.
   * @param maxResults Optional maximum number of issues to return.
   * @returns A promise that resolves with the search results.
   */
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

  /**
   * Finds issues using the issue picker.
   * This is useful for interactive search with type-ahead.
   * @param query The search query.
   * @returns A promise that resolves with the issue picker results.
   */
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

    // This is a specific implementation of search, we'll use the new generic one.
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

      // overlap test: either start or end falls within [startOfDay, endOfDay)
      const withinEnd = _.inRange(+worklogEnd, +startOfDay, +endOfDay);
      const withinStart = _.inRange(+worklogStart, +startOfDay, +endOfDay);
      return withinEnd || withinStart;
    });
  }

  /**
   * Fetches and filters worklogs for a specific day.
   * @param day - The day to fetch logs for, in "YYYY-MM-DD" format.
   * @returns A promise that resolves to an array of sorted worklog entries.
   */
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
