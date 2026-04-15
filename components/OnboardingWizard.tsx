'use client';

import { useState } from 'react';

interface OnboardingWizardProps {
  showMessage: (type: 'success' | 'error', text: string) => void;
}

const STEPS = ['Account', 'Credentials', 'Chain', 'Roles', 'Users', 'Summary'] as const;

export default function OnboardingWizard({ showMessage }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);

  // Step 1: Account
  const [awsAccountId, setAwsAccountId] = useState('');
  const [nickname, setNickname] = useState('');
  const [accountSaved, setAccountSaved] = useState(false);

  // Step 2: Credentials
  const [principalArn, setPrincipalArn] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [credentialValidated, setCredentialValidated] = useState(false);
  const [credentialStored, setCredentialStored] = useState(false);
  const [validationResult, setValidationResult] = useState<{ arn: string; accountId: string } | null>(null);

  // Step 3: Chain
  const [assumedBy, setAssumedBy] = useState('');
  const [chainConfigured, setChainConfigured] = useState(false);
  const [chainTestResult, setChainTestResult] = useState<Array<{ arn: string; status: string }> | null>(null);

  // Step 4: Roles
  const [discoveredRoles, setDiscoveredRoles] = useState<Array<{ roleName: string; arn: string; description: string }>>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [manualRoleName, setManualRoleName] = useState('');

  // Step 5: Users
  const [userEmails, setUserEmails] = useState<string[]>(['']);
  const [accessGranted, setAccessGranted] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);

  const apiCall = async (url: string, method: string, body: Record<string, unknown>): Promise<{ ok: boolean; data: unknown; error?: string }> => {
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = text; }
      if (!response.ok) {
        const err = (data as { Exception?: { Message?: string } })?.Exception?.Message || `HTTP ${response.status}`;
        return { ok: false, data, error: err };
      }
      return { ok: true, data };
    } catch (err) {
      return { ok: false, data: null, error: err instanceof Error ? err.message : 'Network error' };
    }
  };

  // Step 1 handlers
  const handleSaveAccount = async () => {
    if (!/^[0-9]{12}$/.test(awsAccountId)) {
      showMessage('error', 'AWS Account ID must be exactly 12 digits.');
      return;
    }
    setIsLoading(true);
    if (nickname.trim()) {
      const result = await apiCall('/api/admin/account/nickname', 'PUT', { awsAccountId, nickname: nickname.trim() });
      if (!result.ok) { showMessage('error', result.error!); setIsLoading(false); return; }
    }
    setAccountSaved(true);
    showMessage('success', 'Account configured.');
    setIsLoading(false);
  };

  // Step 2 handlers
  const handleValidateCredentials = async () => {
    setIsLoading(true);
    const result = await apiCall('/api/admin/credentials/validate', 'POST', { accessKeyId, secretAccessKey, sessionToken: sessionToken || undefined });
    if (result.ok) {
      const d = result.data as { arn: string; accountId: string };
      setValidationResult(d);
      setCredentialValidated(true);
      showMessage('success', `Credentials valid. Identity: ${d.arn}`);
    } else {
      showMessage('error', result.error!);
    }
    setIsLoading(false);
  };

  const handleStoreCredentials = async () => {
    if (!principalArn.trim()) { showMessage('error', 'Principal ARN is required.'); return; }
    setIsLoading(true);
    const result = await apiCall('/api/admin/credentials', 'POST', {
      principalArn, accessKeyId, secretAccessKey,
      ...(sessionToken && { sessionToken }),
    });
    if (result.ok) {
      setCredentialStored(true);
      showMessage('success', 'Credentials stored securely.');
    } else {
      showMessage('error', result.error!);
    }
    setIsLoading(false);
  };

  // Step 3 handlers
  const handleSetChain = async () => {
    if (!assumedBy.trim()) { showMessage('error', 'Assumed By ARN is required.'); return; }
    setIsLoading(true);
    const result = await apiCall('/api/admin/credentials/relationship', 'POST', { principalArn, assumedBy });
    if (result.ok) {
      setChainConfigured(true);
      showMessage('success', 'Credential chain configured.');
    } else {
      showMessage('error', result.error!);
    }
    setIsLoading(false);
  };

  const handleTestChain = async () => {
    setIsLoading(true);
    const result = await apiCall('/api/admin/credentials/test-chain', 'POST', { principalArn });
    if (result.ok) {
      const d = result.data as { success: boolean; chain: Array<{ arn: string; status: string }> };
      setChainTestResult(d.chain);
      if (d.success) showMessage('success', 'Chain test passed!');
      else showMessage('error', 'Chain test failed. Check results below.');
    } else {
      showMessage('error', result.error!);
    }
    setIsLoading(false);
  };

  // Step 4 handlers
  const handleDiscoverRoles = async () => {
    setIsLoading(true);
    const result = await apiCall('/api/admin/account/roles', 'POST', { principalArn });
    if (result.ok) {
      const d = result.data as { roles: Array<{ roleName: string; arn: string; description: string }> };
      setDiscoveredRoles(d.roles);
      showMessage('success', `Found ${d.roles.length} roles.`);
    } else {
      showMessage('error', result.error! + ' You can manually add role names below.');
    }
    setIsLoading(false);
  };

  const toggleRole = (roleName: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleName)) next.delete(roleName);
      else next.add(roleName);
      return next;
    });
  };

  const handleAddManualRole = () => {
    if (!manualRoleName.trim()) return;
    setDiscoveredRoles((prev) => [...prev, { roleName: manualRoleName.trim(), arn: '', description: '(manually added)' }]);
    setSelectedRoles((prev) => new Set(prev).add(manualRoleName.trim()));
    setManualRoleName('');
  };

  // Step 5 handlers
  const handleGrantAccess = async () => {
    const validEmails = userEmails.filter((e) => e.trim());
    if (validEmails.length === 0 || selectedRoles.size === 0) {
      showMessage('error', 'Add at least one user email and select at least one role.');
      return;
    }
    setIsLoading(true);
    let failures = 0;
    for (const email of validEmails) {
      for (const role of selectedRoles) {
        const result = await apiCall('/api/admin/access', 'POST', { userEmail: email.trim(), awsAccountId, roleName: role });
        if (!result.ok) failures++;
      }
    }
    if (failures === 0) {
      setAccessGranted(true);
      showMessage('success', `Access granted to ${validEmails.length} user(s) for ${selectedRoles.size} role(s).`);
    } else {
      showMessage('error', `${failures} access grant(s) failed. Check logs for details.`);
    }
    setIsLoading(false);
  };

  const inputClass = 'w-full p-3 bg-gray-700 rounded border border-gray-600 text-white focus:border-blue-400 focus:outline-none';
  const btnPrimary = 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded text-white';
  const btnSuccess = 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded text-white';
  const btnSecondary = 'bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              i < step ? 'bg-green-600' : i === step ? 'bg-blue-600' : 'bg-gray-700'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`ml-2 text-sm ${i === step ? 'text-white' : 'text-gray-400'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`w-8 h-0.5 mx-2 ${i < step ? 'bg-green-600' : 'bg-gray-700'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Account */}
      {step === 0 && (
        <div className="bg-gray-800 p-6 rounded space-y-4">
          <h3 className="text-xl font-semibold">Add AWS Account</h3>
          <p className="text-gray-400 text-sm">Enter the 12-digit AWS Account ID and an optional nickname.</p>
          <input type="text" placeholder="AWS Account ID (12 digits)" value={awsAccountId} onChange={(e) => setAwsAccountId(e.target.value)} className={inputClass} pattern="[0-9]{12}" />
          <input type="text" placeholder="Nickname (optional)" value={nickname} onChange={(e) => setNickname(e.target.value)} className={inputClass} />
          {accountSaved && <p className="text-green-400 text-sm">Account configured.</p>}
          <div className="flex justify-between">
            <button onClick={handleSaveAccount} disabled={isLoading || !/^[0-9]{12}$/.test(awsAccountId)} className={btnPrimary}>
              {isLoading ? 'Saving...' : 'Save Account'}
            </button>
            <button onClick={() => setStep(1)} disabled={!accountSaved} className={btnSuccess}>Next</button>
          </div>
        </div>
      )}

      {/* Step 2: Credentials */}
      {step === 1 && (
        <div className="bg-gray-800 p-6 rounded space-y-4">
          <h3 className="text-xl font-semibold">Store Credentials</h3>
          <p className="text-gray-400 text-sm">Enter IAM credentials. Validate first to confirm they work, then store them securely.</p>
          <input type="text" placeholder="Principal ARN (e.g., arn:aws:iam::123456789012:user/username)" value={principalArn} onChange={(e) => setPrincipalArn(e.target.value)} className={inputClass} />
          <input type="text" placeholder="Access Key ID" value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} className={inputClass} />
          <input type="password" placeholder="Secret Access Key" value={secretAccessKey} onChange={(e) => setSecretAccessKey(e.target.value)} className={inputClass} />
          <input type="password" placeholder="Session Token (optional)" value={sessionToken} onChange={(e) => setSessionToken(e.target.value)} className={inputClass} />
          {validationResult && <p className="text-green-400 text-sm">Identity: {validationResult.arn} (Account: {validationResult.accountId})</p>}
          {credentialStored && <p className="text-green-400 text-sm">Credentials stored securely.</p>}
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleValidateCredentials} disabled={isLoading || !accessKeyId || !secretAccessKey} className={btnPrimary}>
              {isLoading ? 'Validating...' : 'Validate'}
            </button>
            <button onClick={handleStoreCredentials} disabled={isLoading || !principalArn || !accessKeyId || !secretAccessKey} className={btnSuccess}>
              {isLoading ? 'Storing...' : 'Store Credentials'}
            </button>
          </div>
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(0)} className={btnSecondary}>Back</button>
            <button onClick={() => setStep(2)} disabled={!credentialStored} className={btnSuccess}>Next</button>
          </div>
        </div>
      )}

      {/* Step 3: Credential Chain */}
      {step === 2 && (
        <div className="bg-gray-800 p-6 rounded space-y-4">
          <h3 className="text-xl font-semibold">Credential Chain (Optional)</h3>
          <p className="text-gray-400 text-sm">If this credential needs to assume an intermediate role first, configure the chain here. Skip if not needed.</p>
          <input type="text" placeholder="Assumed By ARN (the base credential that assumes this role)" value={assumedBy} onChange={(e) => setAssumedBy(e.target.value)} className={inputClass} />
          {chainConfigured && <p className="text-green-400 text-sm">Chain relationship configured.</p>}
          {chainTestResult && (
            <div className="bg-gray-700 p-3 rounded text-sm space-y-1">
              {chainTestResult.map((r, i) => (
                <div key={i} className={r.status.startsWith('ok') ? 'text-green-400' : 'text-red-400'}>
                  {r.arn}: {r.status}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 flex-wrap">
            {assumedBy.trim() && (
              <button onClick={handleSetChain} disabled={isLoading} className={btnPrimary}>
                {isLoading ? 'Setting...' : 'Set Chain'}
              </button>
            )}
            {(chainConfigured || credentialStored) && (
              <button onClick={handleTestChain} disabled={isLoading} className={btnPrimary}>
                {isLoading ? 'Testing...' : 'Test Chain'}
              </button>
            )}
          </div>
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)} className={btnSecondary}>Back</button>
            <button onClick={() => setStep(3)} className={btnSuccess}>Next</button>
          </div>
        </div>
      )}

      {/* Step 4: Roles */}
      {step === 3 && (
        <div className="bg-gray-800 p-6 rounded space-y-4">
          <h3 className="text-xl font-semibold">Discover & Select Roles</h3>
          <p className="text-gray-400 text-sm">Discover IAM roles in the account or add them manually.</p>
          <button onClick={handleDiscoverRoles} disabled={isLoading} className={btnPrimary}>
            {isLoading ? 'Discovering...' : 'Discover Roles'}
          </button>
          {discoveredRoles.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {discoveredRoles.map((role) => (
                <label key={role.roleName} className="flex items-center gap-2 p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600">
                  <input type="checkbox" checked={selectedRoles.has(role.roleName)} onChange={() => toggleRole(role.roleName)} />
                  <span className="font-medium">{role.roleName}</span>
                  {role.description && <span className="text-gray-400 text-sm">— {role.description}</span>}
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input type="text" placeholder="Manually add role name" value={manualRoleName} onChange={(e) => setManualRoleName(e.target.value)} className={inputClass}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddManualRole(); }}
            />
            <button onClick={handleAddManualRole} disabled={!manualRoleName.trim()} className={btnPrimary}>Add</button>
          </div>
          <p className="text-sm text-gray-400">{selectedRoles.size} role(s) selected</p>
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(2)} className={btnSecondary}>Back</button>
            <button onClick={() => setStep(4)} disabled={selectedRoles.size === 0} className={btnSuccess}>Next</button>
          </div>
        </div>
      )}

      {/* Step 5: Users */}
      {step === 4 && (
        <div className="bg-gray-800 p-6 rounded space-y-4">
          <h3 className="text-xl font-semibold">Assign Users</h3>
          <p className="text-gray-400 text-sm">Enter email addresses of users to grant access to the selected roles.</p>
          {userEmails.map((email, i) => (
            <div key={i} className="flex gap-2">
              <input type="email" placeholder="user@example.com" value={email} onChange={(e) => { const next = [...userEmails]; next[i] = e.target.value; setUserEmails(next); }} className={inputClass} />
              {userEmails.length > 1 && (
                <button onClick={() => setUserEmails(userEmails.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 px-2">X</button>
              )}
            </div>
          ))}
          <button onClick={() => setUserEmails([...userEmails, ''])} className="text-blue-400 hover:text-blue-300 text-sm">+ Add another user</button>
          <p className="text-sm text-gray-400">
            Granting access to: {Array.from(selectedRoles).join(', ')} in account {awsAccountId}
          </p>
          {accessGranted && <p className="text-green-400 text-sm">Access granted successfully.</p>}
          <div className="flex gap-3">
            <button onClick={handleGrantAccess} disabled={isLoading || userEmails.every((e) => !e.trim()) || selectedRoles.size === 0} className={btnSuccess}>
              {isLoading ? 'Granting...' : 'Grant Access'}
            </button>
          </div>
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(3)} className={btnSecondary}>Back</button>
            <button onClick={() => setStep(5)} className={btnSuccess}>Next</button>
          </div>
        </div>
      )}

      {/* Step 6: Summary */}
      {step === 5 && (
        <div className="bg-gray-800 p-6 rounded space-y-4">
          <h3 className="text-xl font-semibold">Setup Complete</h3>
          <div className="space-y-3 text-sm">
            <div className="bg-gray-700 p-3 rounded">
              <span className="text-gray-400">Account:</span> {nickname ? `${nickname} (${awsAccountId})` : awsAccountId}
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <span className="text-gray-400">Principal:</span> {principalArn}
            </div>
            {assumedBy && (
              <div className="bg-gray-700 p-3 rounded">
                <span className="text-gray-400">Chain:</span> {assumedBy} → {principalArn}
              </div>
            )}
            <div className="bg-gray-700 p-3 rounded">
              <span className="text-gray-400">Roles:</span> {Array.from(selectedRoles).join(', ')}
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <span className="text-gray-400">Users:</span> {userEmails.filter((e) => e.trim()).join(', ') || '(none assigned)'}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={handleTestChain} disabled={isLoading} className={btnPrimary}>
              {isLoading ? 'Testing...' : 'Test Connection'}
            </button>
            <button onClick={() => setStep(0)} className={btnSecondary}>Back to Start</button>
          </div>
          {chainTestResult && (
            <div className="bg-gray-700 p-3 rounded text-sm space-y-1">
              {chainTestResult.map((r, i) => (
                <div key={i} className={r.status.startsWith('ok') ? 'text-green-400' : 'text-red-400'}>
                  {r.arn}: {r.status}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
