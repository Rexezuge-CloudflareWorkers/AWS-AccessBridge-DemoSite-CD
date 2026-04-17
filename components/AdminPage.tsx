'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import OnboardingWizard from './OnboardingWizard';
import AuditLogsTab from './AuditLogsTab';
import TeamsTab from './TeamsTab';

interface LoadingButtonProps {
  onClick: () => Promise<void> | void;
  disabled?: boolean;
  variant?: 'blue' | 'green' | 'red';
  children: React.ReactNode;
  type?: 'button' | 'submit';
}

const buttonColors: Record<string, { bg: string; hover: string }> = {
  blue: { bg: '#2563eb', hover: '#1d4ed8' },
  green: { bg: '#16a34a', hover: '#15803d' },
  red: { bg: '#dc2626', hover: '#b91c1c' },
};

function LoadingButton({ onClick, disabled = false, variant = 'blue', children, type = 'button' }: LoadingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      await onClick();
    } finally {
      setIsLoading(false);
    }
  };

  const colors = buttonColors[variant] || buttonColors.blue;
  const isDisabledOrLoading = disabled || isLoading;

  const btnStyle: React.CSSProperties = {
    borderRadius: '8px',
    padding: '10px 20px',
    fontWeight: 500,
    color: isDisabledOrLoading ? '#6b7280' : '#ffffff',
    background: isDisabledOrLoading ? '#374151' : isHovered ? colors.hover : colors.bg,
    cursor: isDisabledOrLoading ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'background 0.15s',
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabledOrLoading}
      style={btnStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="animate-spin"
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '9999px',
              border: '2px solid #ffffff',
              borderTopColor: 'transparent',
            }}
          />
        </div>
      ) : (
        children
      )}
    </button>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#1e2433',
  borderRadius: '12px',
  padding: '24px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: '#252d3d',
  borderRadius: '8px',
  border: '1px solid #374151',
  color: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

function FocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  const { style: extraStyle, ...rest } = props;
  return (
    <input
      {...rest}
      style={{
        ...inputStyle,
        borderColor: focused ? '#3b82f6' : '#374151',
        ...extraStyle,
      }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}

interface AdminPageProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function AdminPage({ activeTab: activeTabProp, onTabChange }: AdminPageProps = {}) {
  const activeTab: string = activeTabProp || 'wizard';
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const tabGroups = [
    { header: 'SETUP', tabs: [{ id: 'wizard', label: 'Setup Wizard' }] },
    {
      header: 'CONFIGURATION',
      tabs: [
        { id: 'credentials', label: 'Credentials' },
        { id: 'accounts', label: 'Account Nicknames' },
        { id: 'roleconfig', label: 'Role Config' },
      ],
    },
    {
      header: 'ACCESS',
      tabs: [
        { id: 'access', label: 'User Access' },
        { id: 'teams', label: 'Teams' },
      ],
    },
    {
      header: 'MONITORING',
      tabs: [
        { id: 'spendalerts', label: 'Spend Alerts' },
        { id: 'datacollection', label: 'Data Collection' },
      ],
    },
    {
      header: 'SYSTEM',
      tabs: [
        { id: 'auditlogs', label: 'Audit Logs' },
        { id: 'maintenance', label: 'Maintenance' },
      ],
    },
  ];

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '32px 24px' }}>
      {message &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="animate-slide-down"
            style={{
              position: 'fixed',
              top: '48px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
              padding: '12px 24px',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              background: message.type === 'success' ? 'rgba(22,163,74,0.9)' : 'rgba(220,38,38,0.9)',
              backdropFilter: 'blur(8px)',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                style={{ color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          </div>,
          document.body,
        )}

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <aside
          style={{
            width: '220px',
            flexShrink: 0,
            background: '#1e2433',
            borderRadius: '12px',
            padding: '8px',
            position: 'sticky',
            top: '24px',
          }}
        >
          {tabGroups.map((group, idx) => (
            <div key={group.header} style={{ marginTop: idx === 0 ? 0 : '12px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: '#6b7280',
                  padding: '8px 12px 4px',
                }}
              >
                {group.header}
              </div>
              {group.tabs.map((tab) => (
                <SidebarTab key={tab.id} active={activeTab === tab.id} onClick={() => onTabChange?.(tab.id)}>
                  {tab.label}
                </SidebarTab>
              ))}
            </div>
          ))}
        </aside>

        <div className="animate-fade-in-up" style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'wizard' && <OnboardingWizard showMessage={showMessage} />}
          {activeTab === 'credentials' && <CredentialsTab showMessage={showMessage} />}
          {activeTab === 'access' && <AccessTab showMessage={showMessage} />}
          {activeTab === 'accounts' && <AccountsTab showMessage={showMessage} />}
          {activeTab === 'roleconfig' && <RoleConfigTab showMessage={showMessage} />}
          {activeTab === 'teams' && <TeamsTab showMessage={showMessage} />}
          {activeTab === 'spendalerts' && <SpendAlertsTab showMessage={showMessage} />}
          {activeTab === 'datacollection' && <DataCollectionTab showMessage={showMessage} />}
          {activeTab === 'auditlogs' && <AuditLogsTab showMessage={showMessage} />}
          {activeTab === 'maintenance' && <MaintenanceTab showMessage={showMessage} />}
        </div>
      </div>
    </div>
  );
}

function SidebarTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? '#2563eb' : hovered ? 'rgba(55,65,81,0.5)' : 'transparent',
    color: active ? '#ffffff' : hovered ? '#ffffff' : '#9ca3af',
    boxShadow: active ? '0 4px 6px -1px rgba(37,99,235,0.2)' : 'none',
  };

  return (
    <button onClick={onClick} style={style} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {children}
    </button>
  );
}

function CredentialsTab({ showMessage }: { showMessage: (type: 'success' | 'error', text: string) => void }) {
  const [credForm, setCredForm] = useState({
    principalArn: '',
    accessKeyId: '',
    secretAccessKey: '',
    sessionToken: '',
  });
  const [relationForm, setRelationForm] = useState({
    principalArn: '',
    assumedBy: '',
  });

  const isCredFormValid =
    credForm.principalArn.trim() !== '' && credForm.accessKeyId.trim() !== '' && credForm.secretAccessKey.trim() !== '';
  const isRelationFormValid = relationForm.principalArn.trim() !== '' && relationForm.assumedBy.trim() !== '';
  const isRemoveRelationFormValid = relationForm.principalArn.trim() !== '';

  const handleAddCredentials = async () => {
    if (!isCredFormValid) return;

    try {
      const response = await fetch('/api/admin/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalArn: credForm.principalArn,
          accessKeyId: credForm.accessKeyId,
          secretAccessKey: credForm.secretAccessKey,
          ...(credForm.sessionToken && { sessionToken: credForm.sessionToken }),
        }),
      });

      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      if (response.ok) {
        showMessage('success', 'Credentials added successfully');
        setCredForm({ principalArn: '', accessKeyId: '', secretAccessKey: '', sessionToken: '' });
      } else {
        let errorMessage = 'Failed to add credentials';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      console.error('Network error:', err);
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAddRelation = async () => {
    if (!isRelationFormValid) return;

    try {
      const response = await fetch('/api/admin/credentials/relationship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalArn: relationForm.principalArn,
          assumedBy: relationForm.assumedBy,
        }),
      });

      const responseText = await response.text();
      console.log('Relationship response:', response.status, responseText);

      if (response.ok) {
        showMessage('success', 'Credential relationship added successfully');
        setRelationForm({ principalArn: '', assumedBy: '' });
      } else {
        let errorMessage = 'Failed to add relationship';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      console.error('Network error:', err);
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRemoveRelation = async () => {
    if (!isRemoveRelationFormValid) return;

    try {
      const response = await fetch('/api/admin/credentials/relationship', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalArn: relationForm.principalArn,
        }),
      });

      const responseText = await response.text();
      console.log('Remove relationship response:', response.status, responseText);

      if (response.ok) {
        showMessage('success', 'Credential relationship removed successfully');
        setRelationForm({ principalArn: '', assumedBy: '' });
      } else {
        let errorMessage = 'Failed to remove relationship';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      console.error('Network error:', err);
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={cardStyle}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Add AWS Credentials</h3>
        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FocusInput
            type="text"
            placeholder="Principal ARN (e.g., arn:aws:iam::123456789012:user/username)"
            value={credForm.principalArn}
            onChange={(e) => setCredForm({ ...credForm, principalArn: e.target.value })}
            required
          />
          <FocusInput
            type="text"
            placeholder="Access Key ID"
            value={credForm.accessKeyId}
            onChange={(e) => setCredForm({ ...credForm, accessKeyId: e.target.value })}
            required
          />
          <FocusInput
            type="password"
            placeholder="Secret Access Key"
            value={credForm.secretAccessKey}
            onChange={(e) => setCredForm({ ...credForm, secretAccessKey: e.target.value })}
            required
          />
          <FocusInput
            type="password"
            placeholder="Session Token (Optional)"
            value={credForm.sessionToken}
            onChange={(e) => setCredForm({ ...credForm, sessionToken: e.target.value })}
          />
          <LoadingButton type="submit" onClick={handleAddCredentials} disabled={!isCredFormValid} variant="blue">
            Add Credentials
          </LoadingButton>
        </form>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Manage Credential Relationships</h3>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={(e) => e.preventDefault()}>
          <FocusInput
            type="text"
            placeholder="Principal ARN"
            value={relationForm.principalArn}
            onChange={(e) => setRelationForm({ ...relationForm, principalArn: e.target.value })}
            required
          />
          <FocusInput
            type="text"
            placeholder="Assumed By ARN"
            value={relationForm.assumedBy}
            onChange={(e) => setRelationForm({ ...relationForm, assumedBy: e.target.value })}
            required
          />
          <div style={{ display: 'flex', gap: '16px' }}>
            <LoadingButton onClick={handleAddRelation} disabled={!isRelationFormValid} variant="green">
              Add Relationship
            </LoadingButton>
            <LoadingButton onClick={handleRemoveRelation} disabled={!isRemoveRelationFormValid} variant="red">
              Remove Relationship
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function AccessTab({ showMessage }: { showMessage: (type: 'success' | 'error', text: string) => void }) {
  const [accessForm, setAccessForm] = useState({
    userEmail: '',
    awsAccountId: '',
    roleName: '',
  });

  const isFormValid = accessForm.awsAccountId.trim() !== '' && accessForm.roleName.trim() !== '';

  const handleGrantAccess = async () => {
    if (!isFormValid) return;

    try {
      const response = await fetch('/api/admin/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: accessForm.userEmail || undefined,
          awsAccountId: accessForm.awsAccountId,
          roleName: accessForm.roleName,
        }),
      });

      const responseText = await response.text();
      console.log('Grant access response:', response.status, responseText);

      if (response.ok) {
        showMessage('success', 'Access granted successfully');
        setAccessForm({ userEmail: '', awsAccountId: '', roleName: '' });
      } else {
        let errorMessage = 'Failed to grant access';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      console.error('Network error:', err);
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRevokeAccess = async () => {
    if (!isFormValid) return;

    try {
      const response = await fetch('/api/admin/access', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: accessForm.userEmail || undefined,
          awsAccountId: accessForm.awsAccountId,
          roleName: accessForm.roleName,
        }),
      });

      const responseText = await response.text();
      console.log('Revoke access response:', response.status, responseText);

      if (response.ok) {
        showMessage('success', 'Access revoked successfully');
        setAccessForm({ userEmail: '', awsAccountId: '', roleName: '' });
      } else {
        let errorMessage = 'Failed to revoke access';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      console.error('Network error:', err);
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Manage User Access</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <FocusInput
          type="text"
          placeholder="AWS Account ID (12 digits)"
          value={accessForm.awsAccountId}
          onChange={(e) => setAccessForm({ ...accessForm, awsAccountId: e.target.value })}
          pattern="[0-9]{12}"
        />
        <FocusInput
          type="text"
          placeholder="Role Name"
          value={accessForm.roleName}
          onChange={(e) => setAccessForm({ ...accessForm, roleName: e.target.value })}
        />
        <FocusInput
          type="email"
          placeholder="User Email (Optional, defaults to current user)"
          value={accessForm.userEmail}
          onChange={(e) => setAccessForm({ ...accessForm, userEmail: e.target.value })}
        />
        <div style={{ display: 'flex', gap: '16px' }}>
          <LoadingButton onClick={handleGrantAccess} disabled={!isFormValid} variant="green">
            Grant Access
          </LoadingButton>
          <LoadingButton onClick={handleRevokeAccess} disabled={!isFormValid} variant="red">
            Revoke Access
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

function AccountsTab({ showMessage }: { showMessage: (type: 'success' | 'error', text: string) => void }) {
  const [nicknameForm, setNicknameForm] = useState({
    awsAccountId: '',
    nickname: '',
  });

  const isSetNicknameValid = nicknameForm.awsAccountId.trim() !== '' && nicknameForm.nickname.trim() !== '';
  const isRemoveNicknameValid = nicknameForm.awsAccountId.trim() !== '';

  const handleSetNickname = async () => {
    if (!isSetNicknameValid) return;

    try {
      const response = await fetch('/api/admin/account/nickname', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awsAccountId: nicknameForm.awsAccountId,
          nickname: nicknameForm.nickname,
        }),
      });

      const responseText = await response.text();
      console.log('Set nickname response:', response.status, responseText);

      if (response.ok) {
        showMessage('success', 'Account nickname set successfully');
        setNicknameForm({ awsAccountId: '', nickname: '' });
      } else {
        let errorMessage = 'Failed to set nickname';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      console.error('Network error:', err);
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRemoveNickname = async () => {
    if (!isRemoveNicknameValid) return;

    try {
      const response = await fetch('/api/admin/account/nickname', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awsAccountId: nicknameForm.awsAccountId,
        }),
      });

      const responseText = await response.text();
      console.log('Remove nickname response:', response.status, responseText);

      if (response.ok) {
        showMessage('success', 'Account nickname removed successfully');
        setNicknameForm({ awsAccountId: '', nickname: '' });
      } else {
        let errorMessage = 'Failed to remove nickname';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      console.error('Network error:', err);
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Manage Account Nicknames</h3>
      <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={(e) => e.preventDefault()}>
        <FocusInput
          type="text"
          placeholder="AWS Account ID (12 digits)"
          value={nicknameForm.awsAccountId}
          onChange={(e) => setNicknameForm({ ...nicknameForm, awsAccountId: e.target.value })}
          pattern="[0-9]{12}"
          required
        />
        <FocusInput
          type="text"
          placeholder="Account Nickname"
          value={nicknameForm.nickname}
          onChange={(e) => setNicknameForm({ ...nicknameForm, nickname: e.target.value })}
        />
        <div style={{ display: 'flex', gap: '16px' }}>
          <LoadingButton onClick={handleSetNickname} disabled={!isSetNicknameValid} variant="blue">
            Set Nickname
          </LoadingButton>
          <LoadingButton onClick={handleRemoveNickname} disabled={!isRemoveNicknameValid} variant="red">
            Remove Nickname
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}

function RoleConfigTab({ showMessage }: { showMessage: (type: 'success' | 'error', text: string) => void }) {
  const [configForm, setConfigForm] = useState({
    awsAccountId: '',
    roleName: '',
    destinationPath: '',
    destinationRegion: '',
  });

  const isSetConfigValid = configForm.awsAccountId.trim() !== '' && configForm.roleName.trim() !== '';
  const isDeleteConfigValid = configForm.awsAccountId.trim() !== '' && configForm.roleName.trim() !== '';

  const handleSetConfig = async () => {
    if (!isSetConfigValid) return;

    try {
      const response = await fetch('/api/admin/role/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awsAccountId: configForm.awsAccountId,
          roleName: configForm.roleName,
          ...(configForm.destinationPath && { destinationPath: configForm.destinationPath }),
          ...(configForm.destinationRegion && { destinationRegion: configForm.destinationRegion }),
        }),
      });

      const responseText = await response.text();
      console.log('Set role config response:', response.status, responseText);

      if (response.ok) {
        showMessage('success', 'Role configuration set successfully');
        setConfigForm({ awsAccountId: '', roleName: '', destinationPath: '', destinationRegion: '' });
      } else {
        let errorMessage = 'Failed to set role configuration';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      console.error('Network error:', err);
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteConfig = async () => {
    if (!isDeleteConfigValid) return;

    try {
      const response = await fetch('/api/admin/role/config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awsAccountId: configForm.awsAccountId,
          roleName: configForm.roleName,
        }),
      });

      const responseText = await response.text();
      console.log('Delete role config response:', response.status, responseText);

      if (response.ok) {
        showMessage('success', 'Role configuration deleted successfully');
        setConfigForm({ awsAccountId: '', roleName: '', destinationPath: '', destinationRegion: '' });
      } else {
        let errorMessage = 'Failed to delete role configuration';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      console.error('Network error:', err);
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Manage Role Configurations</h3>
      <p style={{ color: '#d1d5db', marginBottom: '24px' }}>
        Configure custom destination paths and regions for AWS Console redirection when users assume specific roles.
      </p>
      <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={(e) => e.preventDefault()}>
        <FocusInput
          type="text"
          placeholder="AWS Account ID (12 digits)"
          value={configForm.awsAccountId}
          onChange={(e) => setConfigForm({ ...configForm, awsAccountId: e.target.value })}
          pattern="[0-9]{12}"
          required
        />
        <FocusInput
          type="text"
          placeholder="Role Name"
          value={configForm.roleName}
          onChange={(e) => setConfigForm({ ...configForm, roleName: e.target.value })}
          required
        />
        <FocusInput
          type="text"
          placeholder="Destination Path (Optional, e.g., /ec2/home)"
          value={configForm.destinationPath}
          onChange={(e) => setConfigForm({ ...configForm, destinationPath: e.target.value })}
        />
        <FocusInput
          type="text"
          placeholder="Destination Region (Optional, e.g., us-east-1)"
          value={configForm.destinationRegion}
          onChange={(e) => setConfigForm({ ...configForm, destinationRegion: e.target.value })}
        />
        <div style={{ display: 'flex', gap: '16px' }}>
          <LoadingButton onClick={handleSetConfig} disabled={!isSetConfigValid} variant="blue">
            Set Configuration
          </LoadingButton>
          <LoadingButton onClick={handleDeleteConfig} disabled={!isDeleteConfigValid} variant="red">
            Delete Configuration
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}

function SpendAlertsTab({ showMessage }: { showMessage: (type: 'success' | 'error', text: string) => void }) {
  const [createForm, setCreateForm] = useState({
    awsAccountId: '',
    thresholdAmount: '',
    periodType: 'monthly',
  });
  const [deleteAlertId, setDeleteAlertId] = useState('');

  const isCreateValid = createForm.awsAccountId.trim() !== '' && createForm.thresholdAmount.trim() !== '';
  const isDeleteValid = deleteAlertId.trim() !== '';

  const handleCreateAlert = async () => {
    if (!isCreateValid) return;

    try {
      const response = await fetch('/api/admin/cost/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awsAccountId: createForm.awsAccountId,
          thresholdAmount: parseFloat(createForm.thresholdAmount),
          periodType: createForm.periodType,
        }),
      });

      const responseText = await response.text();
      if (response.ok) {
        const data = JSON.parse(responseText);
        showMessage('success', `Spend alert created (ID: ${data.alert?.id || 'unknown'})`);
        setCreateForm({ awsAccountId: '', thresholdAmount: '', periodType: 'monthly' });
      } else {
        let errorMessage = 'Failed to create spend alert';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteAlert = async () => {
    if (!isDeleteValid) return;

    try {
      const response = await fetch('/api/admin/cost/alerts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: deleteAlertId.trim() }),
      });

      const responseText = await response.text();
      if (response.ok) {
        showMessage('success', 'Spend alert deleted');
        setDeleteAlertId('');
      } else {
        let errorMessage = 'Failed to delete spend alert';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={cardStyle}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Create Spend Alert</h3>
        <p style={{ color: '#d1d5db', marginBottom: '24px' }}>
          Set up cost threshold alerts for AWS accounts. Alerts are evaluated against cost data collected by background tasks.
        </p>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={(e) => e.preventDefault()}>
          <FocusInput
            type="text"
            placeholder="AWS Account ID (12 digits)"
            value={createForm.awsAccountId}
            onChange={(e) => setCreateForm({ ...createForm, awsAccountId: e.target.value })}
            pattern="[0-9]{12}"
            required
          />
          <FocusInput
            type="number"
            placeholder="Threshold Amount (USD)"
            value={createForm.thresholdAmount}
            onChange={(e) => setCreateForm({ ...createForm, thresholdAmount: e.target.value })}
            min="0"
            step="0.01"
            required
          />
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 500 }}>
              Period Type
            </label>
            <select
              value={createForm.periodType}
              onChange={(e) => setCreateForm({ ...createForm, periodType: e.target.value })}
              style={{
                ...inputStyle,
                cursor: 'pointer',
              }}
            >
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
            </select>
          </div>
          <LoadingButton onClick={handleCreateAlert} disabled={!isCreateValid} variant="green">
            Create Alert
          </LoadingButton>
        </form>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Delete Spend Alert</h3>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={(e) => e.preventDefault()}>
          <FocusInput
            type="text"
            placeholder="Alert ID (UUID)"
            value={deleteAlertId}
            onChange={(e) => setDeleteAlertId(e.target.value)}
            required
          />
          <LoadingButton onClick={handleDeleteAlert} disabled={!isDeleteValid} variant="red">
            Delete Alert
          </LoadingButton>
        </form>
      </div>
    </div>
  );
}

function DataCollectionTab({ showMessage }: { showMessage: (type: 'success' | 'error', text: string) => void }) {
  const [enableForm, setEnableForm] = useState({
    principalArn: '',
    costEnabled: true,
    resourceEnabled: true,
  });
  const [disableForm, setDisableForm] = useState({
    principalArn: '',
    collectionType: 'cost',
  });

  const isEnableValid = enableForm.principalArn.trim() !== '' && (enableForm.costEnabled || enableForm.resourceEnabled);
  const isDisableValid = disableForm.principalArn.trim() !== '';

  const handleEnableCollection = async () => {
    if (!isEnableValid) return;

    const collectionTypes: string[] = [];
    if (enableForm.costEnabled) collectionTypes.push('cost');
    if (enableForm.resourceEnabled) collectionTypes.push('resource');

    try {
      const response = await fetch('/api/admin/collection/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalArn: enableForm.principalArn,
          collectionTypes,
        }),
      });

      const responseText = await response.text();
      if (response.ok) {
        showMessage('success', `Data collection enabled for ${collectionTypes.join(', ')}`);
        setEnableForm({ principalArn: '', costEnabled: true, resourceEnabled: true });
      } else {
        let errorMessage = 'Failed to enable data collection';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDisableCollection = async () => {
    if (!isDisableValid) return;

    try {
      const response = await fetch('/api/admin/collection/config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalArn: disableForm.principalArn,
          collectionType: disableForm.collectionType,
        }),
      });

      const responseText = await response.text();
      if (response.ok) {
        showMessage('success', `Data collection disabled for ${disableForm.collectionType}`);
        setDisableForm({ principalArn: '', collectionType: 'cost' });
      } else {
        let errorMessage = 'Failed to disable data collection';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const checkboxStyle: React.CSSProperties = {
    width: '18px',
    height: '18px',
    accentColor: '#2563eb',
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={cardStyle}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Enable Data Collection</h3>
        <p style={{ color: '#d1d5db', marginBottom: '24px' }}>
          Enable background cost and/or resource inventory collection for a credential. The credential must have appropriate IAM permissions
          (ce:GetCostAndUsage for cost, ec2/s3/lambda/rds describe/list for resources).
        </p>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={(e) => e.preventDefault()}>
          <FocusInput
            type="text"
            placeholder="Principal ARN (e.g., arn:aws:iam::123456789012:role/MonitoringRole)"
            value={enableForm.principalArn}
            onChange={(e) => setEnableForm({ ...enableForm, principalArn: e.target.value })}
            required
          />
          <div style={{ display: 'flex', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d1d5db', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableForm.costEnabled}
                onChange={(e) => setEnableForm({ ...enableForm, costEnabled: e.target.checked })}
                style={checkboxStyle}
              />
              Cost data collection
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d1d5db', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableForm.resourceEnabled}
                onChange={(e) => setEnableForm({ ...enableForm, resourceEnabled: e.target.checked })}
                style={checkboxStyle}
              />
              Resource inventory collection
            </label>
          </div>
          <LoadingButton onClick={handleEnableCollection} disabled={!isEnableValid} variant="green">
            Enable Collection
          </LoadingButton>
        </form>
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Disable Data Collection</h3>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} onSubmit={(e) => e.preventDefault()}>
          <FocusInput
            type="text"
            placeholder="Principal ARN"
            value={disableForm.principalArn}
            onChange={(e) => setDisableForm({ ...disableForm, principalArn: e.target.value })}
            required
          />
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px', fontWeight: 500 }}>
              Collection Type
            </label>
            <select
              value={disableForm.collectionType}
              onChange={(e) => setDisableForm({ ...disableForm, collectionType: e.target.value })}
              style={{
                ...inputStyle,
                cursor: 'pointer',
              }}
            >
              <option value="cost">Cost</option>
              <option value="resource">Resource</option>
            </select>
          </div>
          <LoadingButton onClick={handleDisableCollection} disabled={!isDisableValid} variant="red">
            Disable Collection
          </LoadingButton>
        </form>
      </div>
    </div>
  );
}

interface CleanupResult {
  deletedCounts: {
    dataCollectionConfig: number;
    roleConfigs: number;
    teamAccounts: number;
    spendAlerts: number;
    costData: number;
    resourceInventory: number;
    awsAccounts: number;
  };
  totalDeleted: number;
}

const CLEANUP_ROW_LABELS: Array<{ key: keyof CleanupResult['deletedCounts']; label: string }> = [
  { key: 'awsAccounts', label: 'aws_accounts' },
  { key: 'roleConfigs', label: 'role_configs' },
  { key: 'teamAccounts', label: 'team_accounts' },
  { key: 'spendAlerts', label: 'spend_alerts' },
  { key: 'costData', label: 'cost_data' },
  { key: 'resourceInventory', label: 'resource_inventory' },
  { key: 'dataCollectionConfig', label: 'data_collection_config' },
];

function MaintenanceTab({ showMessage }: { showMessage: (type: 'success' | 'error', text: string) => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null);

  const handleRunCleanup = async () => {
    if (!confirmed) return;

    try {
      const response = await fetch('/api/admin/maintenance/cleanup-orphaned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const responseText = await response.text();
      if (response.ok) {
        const data = JSON.parse(responseText) as CleanupResult;
        setLastResult(data);
        setConfirmed(false);
        showMessage('success', `Cleanup complete — ${data.totalDeleted} orphaned row(s) removed`);
      } else {
        let errorMessage = 'Failed to run cleanup';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.Exception?.Message || error.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        showMessage('error', errorMessage);
      }
    } catch (err) {
      showMessage('error', `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={cardStyle}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Purge Orphaned Data</h3>
        <p style={{ color: '#d1d5db', marginBottom: '16px' }}>
          Deletes leftover rows for AWS accounts that no user has been granted access to and for credentials that have been removed. An
          account is treated as active only if at least one user has a grant on it (via <code>assumable_roles</code>).
        </p>
        <div
          style={{
            background: '#3f1d1d',
            border: '1px solid #7f1d1d',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#fecaca',
            fontSize: '14px',
            lineHeight: 1.5,
          }}
        >
          <strong>Do not run this while setting up a new account.</strong> If you have added an account nickname, credentials, or role
          config but have not yet granted access to any user, those rows will be treated as orphans and removed.
        </div>
        <p style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>Tables that will be scanned:</p>
        <ul style={{ color: '#d1d5db', marginBottom: '24px', paddingLeft: '20px', fontSize: '14px', lineHeight: 1.8 }}>
          <li>
            <code>aws_accounts</code>, <code>role_configs</code>, <code>team_accounts</code>, <code>spend_alerts</code>,{' '}
            <code>cost_data</code>, <code>resource_inventory</code> — removed when the account has no grants.
          </li>
          <li>
            <code>data_collection_config</code> — removed when the credential no longer exists.
          </li>
        </ul>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#d1d5db',
            cursor: 'pointer',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#dc2626', cursor: 'pointer' }}
          />
          I understand this will permanently delete orphaned rows.
        </label>
        <LoadingButton onClick={handleRunCleanup} disabled={!confirmed} variant="red">
          Run Cleanup
        </LoadingButton>
      </div>

      {lastResult && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Last Run Results</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'max-content 1fr',
              gap: '8px 24px',
              alignItems: 'center',
              fontSize: '14px',
            }}
          >
            {CLEANUP_ROW_LABELS.map(({ key, label }) => (
              <CleanupResultRow key={key} label={label} count={lastResult.deletedCounts[key]} />
            ))}
            <div
              style={{
                gridColumn: '1 / -1',
                height: '1px',
                background: '#374151',
                marginTop: '8px',
                marginBottom: '8px',
              }}
            />
            <div style={{ color: '#d1d5db', fontWeight: 600 }}>Total deleted</div>
            <div style={{ color: '#ffffff', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{lastResult.totalDeleted}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function CleanupResultRow({ label, count }: { label: string; count: number }) {
  const isZero = count === 0;
  return (
    <>
      <code style={{ color: isZero ? '#6b7280' : '#d1d5db' }}>{label}</code>
      <div style={{ color: isZero ? '#6b7280' : '#ffffff', fontVariantNumeric: 'tabular-nums' }}>{count}</div>
    </>
  );
}
