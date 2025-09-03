import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { JiraAccount, Settings } from '../types/jira';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  setSettings: (value: Settings) => void;
  activeAccount: JiraAccount | undefined;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, setSettings }) => {
  const [localSettings, setLocalSettings] = useState<Settings | null>(settings);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(JSON.parse(JSON.stringify(settings)));
    }
  }, [settings, isOpen]);

  const handleSave = () => {
    if (localSettings) {
      setSettings(localSettings);
      onClose();
    }
  };
  const handleAccountChange = (field: keyof JiraAccount, value: any) => {
    if (!localSettings) return;
    const newAccounts = localSettings.accounts.map((acc) => (acc.id === localSettings.activeAccount ? { ...acc, [field]: value } : acc));
    setLocalSettings({ ...localSettings, accounts: newAccounts });
  };
  const handleGlobalSettingChange = (field: keyof Settings, value: any) => {
    if (!localSettings) return;
    setLocalSettings({ ...localSettings, [field]: value });
  };

  const handleAddAccount = () => {
    if (!localSettings) return;
    const newAccount: JiraAccount = {
      id: crypto.randomUUID(),
      jiraSubdomain: '',
      email: '',
      jiraToken: '',
    };
    const newSettings = {
      ...localSettings,
      accounts: [...localSettings.accounts, newAccount],
      activeAccount: newAccount.id,
    };
    setLocalSettings(newSettings);
  };
  const handleRemoveAccount = () => {
    if (!localSettings || !localSettings.activeAccount || localSettings.accounts.length <= 1) return;
    const newAccounts = localSettings.accounts.filter((acc) => acc.id !== localSettings.activeAccount);
    const newActiveAccount = newAccounts[0]?.id || '';
    setLocalSettings({ ...localSettings, accounts: newAccounts, activeAccount: newActiveAccount });
  };
  const selectedAccount = localSettings?.accounts.find((acc) => acc.id === localSettings.activeAccount);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-4">
        <div className={`flex flex-wrap gap-2 mb-4 ${selectedAccount ? 'border-b pb-4' : ''} dark:border-gray-700`}>
          {localSettings?.accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => handleGlobalSettingChange('activeAccount', acc.id)}
              className={`px-3 py-1 text-sm rounded-md ${localSettings.activeAccount === acc.id ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
            >
              {acc.jiraSubdomain || 'New Account'}
            </button>
          ))}
          <button onClick={handleAddAccount} className="px-3 py-1 text-sm rounded-md bg-green-500 text-white hover:bg-green-600">
            +
          </button>
        </div>
        {selectedAccount && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jira Subdomain</label>
              <input
                type="text"
                value={selectedAccount.jiraSubdomain}
                onChange={(e) => handleAccountChange('jiraSubdomain', e.target.value)}
                className="mt-1 block w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                placeholder="your-domain from https://your-domain.atlassian.net"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Your Email</label>
              <input
                type="text"
                value={selectedAccount.email}
                onChange={(e) => handleAccountChange('email', e.target.value)}
                className="mt-1 block w-full p-2 border rounded-md bg-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jira API Token</label>
              <input
                type="password"
                value={selectedAccount.jiraToken}
                onChange={(e) => handleAccountChange('jiraToken', e.target.value)}
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
          </>
        )}
        <div className="border-t pt-4 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Display each item on a new line</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings?.displayOnNewLine || false}
                onChange={(e) => handleGlobalSettingChange('displayOnNewLine', e.target.checked)}
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
                checked={!localSettings?.isHeaderNonFloating || false}
                onChange={(e) => handleGlobalSettingChange('isHeaderNonFloating', !e.target.checked)}
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
                  onClick={() => handleGlobalSettingChange('theme', theme)}
                  className={`px-3 py-1 text-sm rounded-md ${localSettings?.theme === theme ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-between pt-4">
          {localSettings && localSettings.accounts.length > 1 && (
            <button onClick={handleRemoveAccount} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded whitespace-pre">
              Remove Account
            </button>
          )}
          <div className="flex justify-end gap-2 w-full">
            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Save
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
