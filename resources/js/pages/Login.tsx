// resources/js/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Spin, Alert } from 'antd';
import {
    UserOutlined,
    LockOutlined,
    RocketOutlined,
    MoonOutlined,
    SunOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);
    const navigate = useNavigate();
    const { login, isAuthenticated, error, clearError, user } = useAuthStore();

    const [isDark, setIsDark] = useState(() => {
        return (
            localStorage.getItem('theme') === 'dark' ||
            document.documentElement.getAttribute('data-theme') === 'dark'
        );
    });

    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate, user]);

    useEffect(() => {
        return () => {
            clearError();
        };
    }, [clearError]);

    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        if (newDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.body.style.backgroundColor = '#0F172A';
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.body.style.backgroundColor = '#F8FAFC';
            localStorage.setItem('theme', 'light');
        }
    };

    const onFinish = async (values: { email: string; password: string }) => {
        setLoading(true);
        try {
            const result = await login(values.email, values.password, 'admin');
            if (result.success) {
                message.success(result.message || 'Login successful!');
            } else {
                message.error(result.message || 'Login failed');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            message.error(
                err?.response?.data?.message || 'An unexpected error occurred',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setDemoLoading(true);
        try {
            const result = await login(
                'admin@parking.com',
                'password123',
                'admin',
            );
            if (result.success) {
                message.success('Demo login successful!');
            } else {
                message.error(result.message || 'Demo login failed');
            }
        } catch (err: any) {
            console.error('Demo login error:', err);
            message.error('An unexpected error occurred');
        } finally {
            setDemoLoading(false);
        }
    };

    const isDarkMode = isDark;

    return (
        <div
            style={{
                position: 'relative',
                minHeight: '100vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                overflow: 'hidden',
                backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
                transition: 'background-color 0.3s ease',
            }}
        >
            {/* BACKGROUND IMAGE - Only visible in light mode, blurred and darker in dark mode */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url('/images/rabuyaparking.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    filter: isDarkMode
                        ? 'blur(6px) brightness(0.3)'
                        : 'blur(4px)',
                    transform: 'scale(1.05)',
                    zIndex: 0,
                    transition: 'filter 0.3s ease',
                }}
            />

            {/* OVERLAY - darker in dark mode */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: isDarkMode
                        ? 'rgba(0,0,0,0.6)'
                        : 'rgba(0,0,0,0.35)',
                    zIndex: 1,
                    transition: 'background-color 0.3s ease',
                }}
            />

            {/* ─── TOP BAR ──────────────────────────────────────────────────────── */}
            <div
                style={{
                    position: 'absolute',
                    top: 24,
                    left: 32,
                    zIndex: 2,
                    color: '#fff',
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: '-0.3px',
                    textShadow: '0 1px 6px rgba(0,0,0,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                }}
            >
                Rabuya
                <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>
                    Angel's Fuel Station & Parking
                </span>
            </div>

            {/* Theme Toggle Button */}
            <button
                onClick={toggleTheme}
                style={{
                    position: 'absolute',
                    top: 24,
                    right: 32,
                    zIndex: 2,
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 50,
                    padding: '8px 16px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                }}
            >
                {isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>

            {/* ─── LOGIN CARD ────────────────────────────────────────────────── */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '100%',
                    maxWidth: 380,
                    margin: '0 20px',
                    background: isDarkMode
                        ? 'rgba(30, 41, 59, 0.95)'
                        : 'rgba(255,255,255,0.97)',
                    borderRadius: 16,
                    boxShadow: isDarkMode
                        ? '0 20px 50px rgba(0,0,0,0.5)'
                        : '0 20px 50px rgba(0,0,0,0.35)',
                    padding: '36px 32px 28px',
                    backdropFilter: 'blur(12px)',
                    border: isDarkMode
                        ? '1px solid rgba(255,255,255,0.06)'
                        : 'none',
                    transition: 'all 0.3s ease',
                }}
            >
                {/* Heading */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <h2
                        style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: isDarkMode ? '#34D399' : '#10b981',
                            marginBottom: 4,
                            transition: 'color 0.3s ease',
                        }}
                    >
                        Admin Login
                    </h2>
                    <p
                        style={{
                            color: isDarkMode ? '#94A3B8' : '#374151',
                            fontSize: 14,
                            fontWeight: 500,
                        }}
                    >
                        Sign in to manage your system
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        style={{
                            marginBottom: 20,
                            borderRadius: 10,
                            border: isDarkMode
                                ? '1px solid #7F1D1D'
                                : '1px solid #fecaca',
                            backgroundColor: isDarkMode
                                ? 'rgba(127,29,29,0.4)'
                                : '#fef2f2',
                        }}
                        closable
                        onClose={clearError}
                    />
                )}

                <Form
                    name="login"
                    onFinish={onFinish}
                    autoComplete="off"
                    layout="vertical"
                    size="large"
                >
                    <Form.Item
                        name="email"
                        rules={[
                            {
                                required: true,
                                message: 'Please input your email!',
                            },
                            {
                                type: 'email',
                                message: 'Please enter a valid email!',
                            },
                        ]}
                        style={{ marginBottom: 14 }}
                    >
                        <Input
                            prefix={
                                <UserOutlined
                                    style={{
                                        color: isDarkMode
                                            ? '#64748B'
                                            : '#9ca3af',
                                    }}
                                />
                            }
                            placeholder="Email address"
                            style={{
                                borderRadius: 6,
                                height: 42,
                                borderColor: isDarkMode ? '#334155' : '#d1d5db',
                                background: isDarkMode ? '#1E293B' : '#f9fafb',
                                color: isDarkMode ? '#F1F5F9' : '#0F172A',
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            {
                                required: true,
                                message: 'Please input your password!',
                            },
                        ]}
                        style={{ marginBottom: 6 }}
                    >
                        <Input.Password
                            prefix={
                                <LockOutlined
                                    style={{
                                        color: isDarkMode
                                            ? '#64748B'
                                            : '#9ca3af',
                                    }}
                                />
                            }
                            placeholder="Password"
                            style={{
                                borderRadius: 6,
                                height: 42,
                                borderColor: isDarkMode ? '#334155' : '#d1d5db',
                                background: isDarkMode ? '#1E293B' : '#f9fafb',
                                color: isDarkMode ? '#F1F5F9' : '#0F172A',
                            }}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 18, marginBottom: 10 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            style={{
                                height: 42,
                                fontSize: 15,
                                fontWeight: 600,
                                borderRadius: 6,
                                backgroundColor: isDarkMode
                                    ? '#34D399'
                                    : '#2563EB',
                                border: 'none',
                                boxShadow: isDarkMode
                                    ? '0 2px 12px rgba(52,211,153,0.3)'
                                    : '0 2px 6px rgba(37,99,235,0.3)',
                            }}
                        >
                            {loading ? <Spin /> : 'Login'}
                        </Button>
                    </Form.Item>
                </Form>

                {/* ─── DEMO DIVIDER ─────────────────────────────────────────── */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        margin: '16px 0 14px',
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            height: 1,
                            background: isDarkMode ? '#334155' : '#e5e7eb',
                        }}
                    />
                    <span
                        style={{
                            padding: '0 12px',
                            fontSize: 12,
                            color: isDarkMode ? '#64748B' : '#9ca3af',
                            fontWeight: 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }}
                    >
                        Or
                    </span>
                    <div
                        style={{
                            flex: 1,
                            height: 1,
                            background: isDarkMode ? '#334155' : '#e5e7eb',
                        }}
                    />
                </div>

                {/* ─── DEMO LOGIN BUTTON ─────────────────────────────────────── */}
                <Button
                    type="default"
                    icon={<RocketOutlined />}
                    loading={demoLoading}
                    onClick={handleDemoLogin}
                    block
                    style={{
                        height: 42,
                        fontSize: 14,
                        fontWeight: 500,
                        borderRadius: 6,
                        borderColor: isDarkMode ? '#34D399' : '#10b981',
                        color: isDarkMode ? '#34D399' : '#10b981',
                        background: isDarkMode
                            ? 'rgba(52,211,153,0.08)'
                            : 'rgba(16, 185, 129, 0.06)',
                    }}
                >
                    {demoLoading ? <Spin size="small" /> : '🚀 Demo Login'}
                </Button>

                <div
                    style={{
                        marginTop: 10,
                        fontSize: 11,
                        color: isDarkMode ? '#64748B' : '#9ca3af',
                        textAlign: 'center',
                    }}
                >
                    <span
                        style={{
                            fontWeight: 600,
                            color: isDarkMode ? '#94A3B8' : '#6b7280',
                        }}
                    >
                        admin@parking.com
                    </span>
                    {' · '}
                    <span
                        style={{
                            fontWeight: 600,
                            color: isDarkMode ? '#94A3B8' : '#6b7280',
                        }}
                    >
                        password123
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 16,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    zIndex: 2,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.75)',
                    textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
            >
                © {new Date().getFullYear()} Rabuya · All rights reserved
            </div>
        </div>
    );
};

export default Login;
