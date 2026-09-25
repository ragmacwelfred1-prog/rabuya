// resources/js/components/Layout/Header.tsx
import React, { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { soundService } from '../../services/soundService';
import { useNavigate } from 'react-router-dom';
import {
    message,
    Dropdown,
    Avatar,
    Space,
    MenuProps,
    Badge,
    List,
    Popover,
    Button,
    Tag,
    Tooltip,
} from 'antd';
import {
    UserOutlined,
    LogoutOutlined,
    SettingOutlined,
    MoonFilled,
    SunFilled,
    BellOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    WarningOutlined,
    InfoCircleOutlined,
    WifiOutlined,
    DisconnectOutlined,
    SoundFilled,
    SoundOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const Header: React.FC = () => {
    const { user, logout } = useAuthStore();
    const {
        notifications,
        unreadCount,
        isConnected,
        connect,
        disconnect,
        markAsRead,
        markAllAsRead,
        clearAll,
    } = useNotificationStore();
    const navigate = useNavigate();

    const [isDark, setIsDark] = React.useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    const [soundEnabled, setSoundEnabled] = React.useState(() =>
        soundService.isSoundEnabled(),
    );

    // ─── Connect / Disconnect (polling) ──────────────────────────────────
    useEffect(() => {
        connect(user?.id);

        return () => {
            disconnect();
        };
    }, [user?.id]);

    // ─── Debug ────────────────────────────────────────────────────────────
    useEffect(() => {
        console.log('🔔 Header: notifications =', notifications.length);
        console.log('🔔 Header: unread =', unreadCount);
        console.log('🔔 Header: polling connected =', isConnected);
    }, [notifications, unreadCount, isConnected]);

    // ─── Theme toggle ─────────────────────────────────────────────────────
    React.useEffect(() => {
        const html = document.documentElement;
        if (isDark) {
            html.setAttribute('data-theme', 'dark');
            document.body.style.backgroundColor = '#0F172A';
        } else {
            html.removeAttribute('data-theme');
            document.body.style.backgroundColor = '#F8FAFC';
        }
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    // ─── Sound toggle ─────────────────────────────────────────────────────
    const toggleSound = () => {
        soundService.toggle();
        setSoundEnabled(soundService.isSoundEnabled());
        message.success(
            `Sound ${soundService.isSoundEnabled() ? 'enabled' : 'disabled'}`,
        );
    };

    // ─── Handlers ─────────────────────────────────────────────────────────
    const handleLogout = async () => {
        try {
            await logout();
            message.success('Logged out successfully');
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('Logout error:', error);
            navigate('/login', { replace: true });
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircleOutlined style={{ color: '#10B981' }} />;
            case 'error':
                return <CloseCircleOutlined style={{ color: '#EF4444' }} />;
            case 'warning':
                return <WarningOutlined style={{ color: '#F59E0B' }} />;
            default:
                return <InfoCircleOutlined style={{ color: '#3B82F6' }} />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'success':
                return 'green';
            case 'error':
                return 'red';
            case 'warning':
                return 'orange';
            default:
                return 'blue';
        }
    };

    const items: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Profile',
            onClick: () => navigate('/profile'),
        },
        {
            key: 'settings',
            icon: <SettingOutlined />,
            label: 'Settings',
            onClick: () => navigate('/settings'),
        },
        { type: 'divider' },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Sign Out',
            onClick: handleLogout,
            danger: true,
        },
    ];

    const getDisplayName = () => {
        if (user?.first_name && user?.last_name)
            return `${user.first_name} ${user.last_name}`;
        if (user?.first_name) return user.first_name;
        if (user?.email) return user.email.split('@')[0];
        return 'Guest';
    };

    const getUserRole = () => {
        if (user?.role === 'admin') return 'Administrator';
        if (user?.role === 'staff') return 'Staff';
        if (user?.role === 'customer') return 'Customer';
        return 'User';
    };

    // ─── Notification Content ─────────────────────────────────────────────
    const notificationContent = (
        <div style={{ width: 380, maxHeight: 400, overflowY: 'auto' }}>
            <div
                style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isConnected
                        ? 'var(--success-bg)'
                        : 'var(--danger-bg)',
                    borderRadius: '8px 8px 0 0',
                }}
            >
                <span
                    style={{
                        fontSize: 12,
                        color: isConnected
                            ? 'var(--success-text)'
                            : 'var(--danger-text)',
                        fontWeight: 500,
                    }}
                >
                    {isConnected ? (
                        <>
                            <WifiOutlined /> Auto-refresh active (5s)
                        </>
                    ) : (
                        <>
                            <DisconnectOutlined /> Polling stopped
                        </>
                    )}
                </span>
                <Tag color={isConnected ? 'green' : 'red'} style={{ margin: 0 }}>
                    {isConnected ? 'Live' : 'Offline'}
                </Tag>
            </div>

            <div
                style={{
                    padding: '4px 12px',
                    background: 'var(--bg-surface-hover)',
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    borderBottom: '1px solid var(--border-color)',
                }}
            >
                📊 {notifications.length} notification
                {notifications.length !== 1 ? 's' : ''} · {unreadCount} unread
            </div>

            {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <BellOutlined style={{ fontSize: 32, color: 'var(--text-tertiary)' }} />
                    <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                        No notifications
                    </p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
                        💡 All caught up!
                    </p>
                </div>
            ) : (
                <List
                    size="small"
                    dataSource={notifications.slice(0, 20)}
                    renderItem={(item) => (
                        <List.Item
                            key={item.id || Math.random()}
                            onClick={() => markAsRead(item.id!)}
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                background: item.read
                                    ? 'transparent'
                                    : 'var(--bg-surface-hover)',
                                borderRadius: 6,
                                marginBottom: 2,
                                borderLeft: `3px solid ${getTypeColor(item.type)}`,
                            }}
                        >
                            <List.Item.Meta
                                avatar={getIcon(item.type)}
                                title={
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                color: 'var(--text-primary)',
                                                fontSize: 13,
                                            }}
                                        >
                                            {item.title}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 10,
                                                color: 'var(--text-tertiary)',
                                            }}
                                        >
                                            {item.timestamp
                                                ? dayjs(item.timestamp).fromNow()
                                                : 'just now'}
                                        </span>
                                    </div>
                                }
                                description={
                                    <span
                                        style={{
                                            fontSize: 12,
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        {item.message}
                                    </span>
                                }
                            />
                        </List.Item>
                    )}
                />
            )}

            {notifications.length > 0 && (
                <div
                    style={{
                        padding: '8px 12px',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        background: 'var(--bg-surface-hover)',
                        borderRadius: '0 0 8px 8px',
                    }}
                >
                    <Button
                        type="text"
                        size="small"
                        onClick={markAllAsRead}
                        style={{ color: 'var(--primary)' }}
                    >
                        Mark all as read
                    </Button>
                    <Button
                        type="text"
                        size="small"
                        onClick={clearAll}
                        style={{ color: 'var(--danger)' }}
                    >
                        Clear all
                    </Button>
                </div>
            )}
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────────────
    return (
        <header className="header">
            <div className="header-left">
                <div>
                    <h1>Park &amp; Fuel Management System</h1>
                    <div className="header-subtitle">
                        Manage your parking and fuel operations
                        {user && (
                            <span
                                style={{
                                    marginLeft: 12,
                                    fontSize: 11,
                                    color: 'var(--text-tertiary)',
                                }}
                            >
                                👤 {user.first_name}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="header-right">
                <Tooltip
                    title={
                        soundEnabled
                            ? 'Sound is ON - Click to mute'
                            : 'Sound is OFF - Click to unmute'
                    }
                >
                    <Button
                        type="text"
                        icon={
                            soundEnabled ? (
                                <SoundFilled style={{ color: '#10B981', fontSize: 18 }} />
                            ) : (
                                <SoundOutlined
                                    style={{
                                        color: 'var(--text-tertiary)',
                                        fontSize: 18,
                                    }}
                                />
                            )
                        }
                        onClick={toggleSound}
                        style={{
                            borderRadius: 20,
                            borderColor: 'var(--border-color)',
                            background: soundEnabled ? 'var(--success-bg)' : 'transparent',
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    />
                </Tooltip>

                <Popover
                    content={notificationContent}
                    title={
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingBottom: 4,
                            }}
                        >
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                🔔 Notifications
                            </span>
                            {unreadCount > 0 && (
                                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                    {unreadCount} unread
                                </span>
                            )}
                        </div>
                    }
                    trigger="click"
                    placement="bottomRight"
                    overlayStyle={{ padding: 0 }}
                >
                    <Badge
                        count={unreadCount}
                        size="small"
                        offset={[-4, 4]}
                        style={{
                            backgroundColor: unreadCount > 0 ? '#EF4444' : 'transparent',
                        }}
                    >
                        <Button
                            icon={<BellOutlined />}
                            style={{
                                borderRadius: 20,
                                borderColor: 'var(--border-color)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-secondary)',
                                border: !isConnected ? '1px solid #EF4444' : undefined,
                            }}
                        >
                            Notifications
                            {!isConnected && (
                                <span
                                    style={{
                                        marginLeft: 4,
                                        fontSize: 10,
                                        color: '#EF4444',
                                    }}
                                >
                                    ●
                                </span>
                            )}
                        </Button>
                    </Badge>
                </Popover>

                <div
                    className="theme-toggle-btn"
                    onClick={() => setIsDark((prev) => !prev)}
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {isDark ? (
                        <>
                            <SunFilled />
                            <span>Light</span>
                        </>
                    ) : (
                        <>
                            <MoonFilled />
                            <span>Dark</span>
                        </>
                    )}
                </div>

                <Dropdown
                    menu={{ items }}
                    placement="bottomRight"
                    trigger={['click']}
                >
                    <Space style={{ cursor: 'pointer' }} className="user-dropdown">
                        <Avatar
                            icon={<UserOutlined />}
                            style={{
                                background: isDark
                                    ? 'linear-gradient(135deg, #34D399, #059669)'
                                    : 'linear-gradient(135deg, #2563EB, #7C3AED)',
                                width: 34,
                                height: 34,
                                fontSize: 15,
                            }}
                        />
                        <div className="user-info">
                            <div className="user-name">{getDisplayName()}</div>
                            <div className="user-role">
                                {getUserRole()}
                                {isConnected ? (
                                    <span
                                        style={{
                                            marginLeft: 6,
                                            fontSize: 8,
                                            color: '#10B981',
                                            display: 'inline-block',
                                        }}
                                    >
                                        ●
                                    </span>
                                ) : (
                                    <span
                                        style={{
                                            marginLeft: 6,
                                            fontSize: 8,
                                            color: '#EF4444',
                                            display: 'inline-block',
                                        }}
                                    >
                                        ○
                                    </span>
                                )}
                            </div>
                        </div>
                    </Space>
                </Dropdown>
            </div>
        </header>
    );
};

export default Header;