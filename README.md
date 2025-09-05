# Jira Time Tracker

This application is designed to help you easily track and visualize your time spent on Jira tickets. With an intuitive interface, you can start and stop timers, manually add and edit worklogs, and get a clear overview of your daily and weekly progress.

### [Feature Requests](https://github.com/yrambler2001/jira-time-tracker/issues?q=state%3Aopen%20label%3Aenhancement)

### [Known issues](https://github.com/yrambler2001/jira-time-tracker/issues?q=state%3Aopen%20label%3Abug)

### [Changelog](./CHANGELOG.md)

## Getting Started: Initial Setup

Before you can start tracking time, you need to connect the application to your Jira account.

1.  Click on the **Settings** icon (⚙️) in the top-right corner of the dashboard.
2.  In the Settings modal, click on the **+** icon, you will need to provide the following information:
    - **Jira Subdomain**: This is the unique part of your organization's Jira URL. For example, if your Jira URL is `https://my-company.atlassian.net`, your subdomain is `my-company`.
    - **Your Email**: The email address you use for your Jira account.
    - **Jira API Token**: You can create a personal access token for your Jira account by following the instructions on the Atlassian website. Open the link under the field ([link](https://id.atlassian.com/manage-profile/security/api-tokens)) and click "Create API Token". Choose a clear name for the token to distinguish it from others and clarify its purpose. For security, the token is stored only in your browser's local storage. It is advisable to set a one-year expiration to avoid weekly refreshes.
3.  Click **Save**. The application will then connect to your Jira account and fetch your data.

## The Dashboard

The main dashboard provides a visual representation of your logged time for a selected day.

### Timeline View

The central part of the dashboard is the timeline view, which shows your worklogs plotted on a timeline for the selected day.

- **Grouped View**: By default, your timelogs are grouped by Jira project, giving you a consolidated view of your work.
- **Individual View**: You can switch to an individual view where each timelog is displayed on its own line. This can be changed in the Settings modal by enabling "Display each item on a new line".
- **Hover for Details**: Hover over any timelog in the timeline to see a tooltip with more details, including the ticket summary, start and end times, duration, and work description.

### Navigating Dates

- Use the date picker at the top of the dashboard to select the day you want to view.
- The "Total for Day" display shows the total time you have logged for the selected date.

## Tracking Your Time

There are two primary ways to log your time: using the real-time tracker or adding worklogs manually.

### Live Time Tracking

- **Start Tracking**:
  - Click the **Search** icon (🔍) to open the ticket search modal.
  - Find the ticket you want to work on and click the "Start Tracking" button.
  - Alternatively, you can start tracking from the "Timelog Details" table by clicking the "Start" button on any existing log for that ticket.
- **While Tracking**:
  - An active timer will appear in the "Timelog Details" table at the bottom of the page.
  - You can click on the active log to open a modal where you can edit the start time and add a work description while the timer is running.
- **Stop Tracking**:
  - Once you've finished your work, click the "Stop" button next to the active timer in the "Timelog Details" table.
  - A modal will appear, allowing you to review and adjust the start time, end time, duration, and work description before submitting the worklog to Jira.
- **Discarding a Timer**:
  - If you started a timer by mistake, you can click the "Discard" button to delete it without saving a worklog.

### Adding and Editing Worklogs

- **Adding a Manual Worklog**:
  - Click the **Search** icon (🔍) to find a ticket.
  - Click the "Add Log" button next to the desired ticket in the search results.
  - A form will appear where you can enter the Work Description, Start Time, End Time, and Duration.
  - The form includes a handy auto-calculation feature. You can lock one of the time fields (start, end, or duration), and it will be automatically calculated based on the other two.
- **Editing an Existing Worklog**:
  - In the "Timelog Details" table, click on any worklog to open the edit modal.
  - You can modify the time and work description and then click "Update Timelog" to save your changes.
- **Deleting a Worklog**:
  - When editing a worklog, you can click the "Delete" button to permanently remove it from Jira.

## Finding Jira Tickets

The integrated search functionality makes it easy to find the tickets you need.

- **Search Modal**: Click the **Search** icon (🔍) to open the search modal.
- **Search By**: You can search for tickets using different criteria:
  - **Key / Text (Default)**: This is the most powerful and recommended search option. It works in several ways:
      - If you enter a **full key** (e.g., "PROJ-123"), it will find the exact ticket.
      - If you enter just a **number** (e.g., "123"), it will automatically search for that number across all your projects (e.g., "PROJ-123", "TEST-123", etc.).
      - If you enter any other **text**, it will perform a broad search across the ticket's summary, description, and comments.
  - **Full Key**: Use this for an exact key match (e.g., "PROJ-123").
  - **Label**: Search for keywords in the ticket's summary (title).
  - **Text Only**: A broad search that includes the summary, description, and comments, but not the key.
  - **My Tickets on Board**: Shows tickets assigned to you in open sprints.
  - **JQL**: For advanced users, you can use a custom JQL query.
- **Order By**: You can sort the search results by Key, Time Spent, Updated date, or Priority.

## Starred Tickets

- **Starring a Ticket**: Click the star icon (⭐) next to any ticket in the search results or the "Timelog Details" table to add it to your starred list.
- **Quick Access**: Your starred tickets will appear by default when you open the search modal, giving you quick access to the tickets you work on most frequently.

## Settings

The settings modal allows you to customize your experience:

- **Display each item on a new line**: As mentioned earlier, this changes the timeline view to show each worklog on its own line instead of grouping them by project.
- You can also update your Jira Subdomain, Email, and API Token here.

## Technologies Used

- React
- TypeScript
- Vite
- Tailwind CSS
- Moment.js
- Lodash
- ESLint
- Netlify Edge Functions
