import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import type { JiraTicket, JiraProject } from '../types/jira';
import { StarIcon } from './Icons';
import { JiraApiClient } from '../services/jira';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLog: (ticket: JiraTicket) => void;
  onStartTracking: (ticket: JiraTicket) => void;
  client: JiraApiClient | null;
  starredTickets: string[];
  toggleStar: (key: string) => void;
}

type SearchType = 'key' | 'text' | 'summary' | 'jql' | 'myTickets' | 'keyOrText';

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onAddLog, onStartTracking, client, starredTickets, toggleStar }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<JiraTicket[]>([]);
  const [starredIssues, setStarredIssues] = useState<JiraTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStarred, setIsLoadingStarred] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>('keyOrText');
  const [orderBy, setOrderBy] = useState('key');
  
  const [projectKeys, setProjectKeys] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && client && projectKeys.length === 0) {
      client.getAllProjects()
        .then(projects => {
          const keys = projects.map(p => p.key);
          setProjectKeys(keys);
        })
        .catch(err => console.error('Failed to fetch project keys', err));
    }
  }, [isOpen, client, projectKeys.length]);

  useEffect(() => {
    if (isOpen && client && starredTickets.length > 0) {
      setIsLoadingStarred(true);
      const jql = `key in (${starredTickets.map((k) => `"${k}"`).join(',')})`;
      client
        .searchIssuesByJql(jql)
        .then((response) => {
          const tickets = response.issues.map((issue) => ({
            key: issue.key,
            summary: issue.fields.summary,
            self: issue.self,
          }));
          setStarredIssues(tickets);
        })
        .catch((err) => console.error('Failed to fetch starred tickets', err))
        .finally(() => setIsLoadingStarred(false));
    } else if (isOpen) {
      setStarredIssues([]);
    }
  }, [isOpen, client, starredTickets]);

  const performSearch = useCallback(
    (currentSearchTerm: string, currentSearchType: SearchType, currentOrderBy: string) => {
      if (!client) return;

      let isSearchable = false;
      if (currentSearchType === 'myTickets') {
        isSearchable = true;
      } else {
        isSearchable = currentSearchTerm.length > 0;
      }

      if (isSearchable) {
        setIsLoading(true);
        let baseJql = '';

        const isNumericSearch = /^\d+$/.test(currentSearchTerm);
        const keyQueryPart = isNumericSearch && projectKeys.length > 0 
            ? projectKeys.map(key => `key = "${key}-${currentSearchTerm}"`).join(' OR ')
            : `key = "${currentSearchTerm.toUpperCase()}"`;
        
        const textQueryPart = `text ~ "${currentSearchTerm}"`;

        switch (currentSearchType) {
          case 'keyOrText':
            baseJql = `(${keyQueryPart}) OR ${textQueryPart}`;
            break;
          case 'key':
            baseJql = keyQueryPart;
            break;
          case 'text':
            baseJql = textQueryPart;
            break;
          case 'summary':
            baseJql = `summary ~ "${currentSearchTerm}"`;
            break;
          case 'jql':
            baseJql = currentSearchTerm;
            break;
          case 'myTickets':
            baseJql = 'assignee = currentUser() and sprint in openSprints()';
            break;
        }

        let orderByClause = '';
        switch (currentOrderBy) {
          case 'key':
            orderByClause = ' order by project asc, key desc';
            break;
          case 'timespent':
            orderByClause = ' order by timespent desc';
            if (!baseJql.toLowerCase().includes('timespent')) baseJql += ' and timespent is not empty';
            break;
          case 'updated':
            orderByClause = ' order by updated desc';
            break;
          case 'priority':
            orderByClause = ' order by priority desc';
            break;
        }

        const jql = baseJql.toLowerCase().includes('order by') ? baseJql : baseJql + orderByClause;

        client
          .searchIssuesByJql(jql)
          .then((response) => {
            const tickets = response.issues.map((issue) => ({
              key: issue.key,
              summary: issue.fields.summary,
              self: issue.self,
            }));
            setSearchResults(tickets);
          })
          .catch((err) => console.error('Search failed:', err))
          .finally(() => setIsLoading(false));
      } else {
        setSearchResults([]);
      }
    },
    [client, projectKeys],
  );

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      return;
    }

    const handler = setTimeout(() => {
      performSearch(searchTerm, searchType, orderBy);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, searchType, orderBy, isOpen, performSearch]);

  const handleStartTracking = (ticket: JiraTicket) => {
    onStartTracking(ticket);
    onClose();
  };

  const renderTicketRow = (ticket: JiraTicket) => (
    <div key={ticket.key} className="p-2 border-b dark:border-gray-700 flex justify-between items-center">
      <div>
        <div className="font-semibold text-blue-600 dark:text-blue-400">{ticket.key}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{ticket.summary}</div>
      </div>
      <div className="flex gap-2 items-center">
        <button
          onClick={() => toggleStar(ticket.key)}
          className={`p-1 rounded-full transition-colors ${
            starredTickets.includes(ticket.key) ? 'text-yellow-400 hover:text-yellow-500' : 'text-gray-400 hover:text-yellow-400'
          }`}
        >
          <StarIcon filled={starredTickets.includes(ticket.key)} />
        </button>
        <button onClick={() => handleStartTracking(ticket)} className="bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded">
          Start Tracking
        </button>
        <button onClick={() => onAddLog(ticket)} className="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded">
          Add Log
        </button>
      </div>
    </div>
  );

  const renderRadioGroup = (options: { value: string; label: string }[], selectedValue: string, onChange: (value: any) => void, name: string) => (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-2 py-2 text-sm text-gray-700 dark:text-gray-300">
      {options.map(({ value, label }) => (
        <label key={value} className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name={name} value={value} checked={selectedValue === value} onChange={() => onChange(value)} className="dark:accent-blue-500" />
          {label}
        </label>
      ))}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Jira Ticket">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search for a ticket..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
            autoFocus
            disabled={searchType === 'myTickets'}
          />
        </div>
        <div className="space-y-2">
          <div>
            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Search by:</span>
            {renderRadioGroup(
              [
                { value: 'keyOrText', label: 'Key / Text' },
                { value: 'key', label: 'Full Key' },
                { value: 'summary', label: 'Label' },
                { value: 'text', label: 'Text Only' },
                { value: 'myTickets', label: 'My Tickets on Board' },
                { value: 'jql', label: 'JQL' },
              ],
              searchType,
              (value) => setSearchType(value as SearchType),
              'searchType',
            )}
          </div>
          <div>
            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Order by:</span>
            {renderRadioGroup(
              [
                { value: 'key', label: 'Key' },
                { value: 'timespent', label: 'Time Spent' },
                { value: 'updated', label: 'Updated' },
                { value: 'priority', label: 'Priority' },
              ],
              orderBy,
              setOrderBy,
              'orderBy',
            )}
          </div>
        </div>

        <div className="max-h-150 overflow-y-auto">
          {isLoading && <div className="p-2 text-center text-gray-500">Searching...</div>}
          {isLoadingStarred && searchTerm.length === 0 && searchType !== 'myTickets' && (
            <div className="p-2 text-center text-gray-500">Loading starred tickets...</div>
          )}

          {!isLoadingStarred && searchTerm.length === 0 && searchType !== 'myTickets' && starredIssues.length > 0 && (
            <>
              <div className="p-2 text-xs font-semibold text-gray-500 uppercase">Starred Tickets</div>
              {starredIssues.map(renderTicketRow)}
            </>
          )}

          {!isLoading && searchResults.map(renderTicketRow)}

          {!isLoading && searchType !== 'myTickets' && searchTerm.length > 0 && searchResults.length === 0 && (
            <div className="p-2 text-center text-gray-500">No results found.</div>
          )}
          {!isLoadingStarred && searchTerm.length === 0 && searchType !== 'myTickets' && starredTickets.length === 0 && (
            <div className="p-2 text-center text-gray-500">No starred tickets. Use the search to find and star tickets.</div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SearchModal;
