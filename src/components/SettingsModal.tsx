import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { Settings } from '../types/jira';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  setSettings: (value: Settings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, setSettings }) => {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  const handleSave = () => {
    setSettings(localSettings);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jira Subdomain</label>
          <input
            type="text"
            value={localSettings.jiraSubdomain}
            onChange={(e) => setLocalSettings({ ...localSettings, jiraSubdomain: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
            placeholder="your-domain from https://your-domain.atlassian.net"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Email</label>
          <input
            type="text"
            value={localSettings.email}
            onChange={(e) => setLocalSettings({ ...localSettings, email: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jira API Token</label>
          <input
            type="password"
            value={localSettings.jiraToken}
            onChange={(e) => setLocalSettings({ ...localSettings, jiraToken: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
          />
          <a
            href="https://id.atlassian.com/manage-profile/security/api-tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline mt-1 inline-block"
          >
            How to create an API token
          </a>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Display each item on a new line</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.displayOnNewLine}
              onChange={(e) => setLocalSettings({ ...localSettings, displayOnNewLine: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
          </label>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Floating Header</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!localSettings.isHeaderNonFloating}
              onChange={(e) => setLocalSettings({ ...localSettings, isHeaderNonFloating: !e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
          </label>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
          <div className="flex items-center gap-2">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => setLocalSettings({ ...localSettings, theme })}
                className={`px-3 py-1 text-sm rounded-md ${localSettings.theme === theme ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
