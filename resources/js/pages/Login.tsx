// resources/js/pages/Login.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, message, Spin, Alert } from 'antd';
import {
    UserOutlined,
    LockOutlined,
    MoonOutlined,
    SunOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, isAuthenticated, error, clearError, user, completeLogin } =
        useAuthStore();

    // Guard against double-submit on verifyOtp (auto-submit on onChange
    // + manual click on the Verify button). useRef so it doesn't
    // trigger a re-render.
    const verifyingRef = useRef(false);

    // ─── OTP step state ──────────────────────────────────────────
    // Hydrated from sessionStorage so that a component remount
    // (e.g. caused by a stray global isLoading flip somewhere in the
    // app tree) does not silently kick the user back to the email
    // form after they've already received an OTP.
    const [step, setStep] = useState<'credentials' | 'otp'>(() => {
        return sessionStorage.getItem('login_step') === 'otp'
            ? 'otp'
            : 'credentials';
    });
    const [challenge, setChallenge] = useState(
        () => sessionStorage.getItem('login_challenge') ?? ''
    );
    const [emailHint, setEmailHint] = useState(
        () => sessionStorage.getItem('login_email_hint') ?? ''
    );
    const [otp, setOtp] = useState('');
    const [resendIn, setResendIn] = useState(0);

    const [isDark, setIsDark] = useState(() => {
        return (
            localStorage.getItem('theme') === 'dark' ||
            document.documentElement.getAttribute('data-theme') === 'dark'
        );
    });

    // Persist OTP-relevant state so a remount doesn't lose it
    useEffect(() => {
        if (step === 'otp' && challenge) {
            sessionStorage.setItem('login_step', 'otp');
            sessionStorage.setItem('login_challenge', challenge);
            sessionStorage.setItem('login_email_hint', emailHint);
        }
    }, [step, challenge, emailHint]);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            // Clear the OTP scratch state now that we're authenticated
            sessionStorage.removeItem('login_step');
            sessionStorage.removeItem('login_challenge');
            sessionStorage.removeItem('login_email_hint');
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, navigate, user]);

    useEffect(() => {
        return () => {
            clearError();
        };
    }, [clearError]);

    // Resend countdown
    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setInterval(
            () => setResendIn((s) => Math.max(0, s - 1)),
            1000
        );
        return () => clearInterval(t);
    }, [resendIn]);

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

    const clearOtpScratch = () => {
        sessionStorage.removeItem('login_step');
        sessionStorage.removeItem('login_challenge');
        sessionStorage.removeItem('login_email_hint');
    };

    // ─── STEP 1: email + password → triggers OTP email ───────────
    const onFinish = async (values: { email: string; password: string }) => {
        setLoading(true);
        clearError();
        try {
            const result = await login(values.email, values.password, 'admin');

            if (result.success && result.otp_required) {
                setChallenge(result.challenge ?? '');
                setEmailHint(result.email_hint ?? '');
                setOtp('');
                setResendIn(60);
                setStep('otp');
                message.success(
                    result.message ||
                        'Verification code sent to your email.'
                );
                return;
            }

            if (result.success) {
                message.success(result.message || 'Login successful!');
            } else {
                message.error(result.message || 'Login failed');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            message.error(
                err?.response?.data?.message || 'An unexpected error occurred'
            );
        } finally {
            setLoading(false);
        }
    };

    // ─── STEP 2: submit the 6-digit code ─────────────────────────
    const verifyOtp = async (code = otp) => {
        if (code.length !== 6) return;
        // Guard: huwag payagan ang pangalawang sabay na request
        // (nangyayari kapag nag-auto-submit sa onChange at pinindot
        // din agad ang Verify button).
        if (verifyingRef.current) return;
        verifyingRef.current = true;

        setLoading(true);
        clearError();
        try {
            const res = await api.post('/login/verify-otp', {
                challenge,
                otp: code,
            });

            completeLogin(res.data.token, res.data.user, res.data.user_type);
            message.success('Login successful!');
        } catch (err: any) {
            // A wrong OTP is also a 422 and the backend message
            // ("Invalid or expired code.") contains the word "expired".
            // Only bail back to credentials when the session is really dead.
            const status = err?.response?.status;
            const msg =
                err?.response?.data?.message || 'Verification failed';

            message.error(msg);
            setOtp('');

            const sessionDead =
                status === 429 ||
                status === 403 ||
                /session expired|too many attempts|account unavailable/i.test(
                    msg
                );

            if (sessionDead) {
                setStep('credentials');
                setChallenge('');
                setEmailHint('');
                setResendIn(0);
                clearOtpScratch();
            }
        } finally {
            setLoading(false);
            verifyingRef.current = false;
        }
    };

    const resendOtp = async () => {
        try {
            await api.post('/login/resend-otp', { challenge });
            setResendIn(60);
            setOtp('');
            message.success('New code sent to your email.');
        } catch (err: any) {
            const msg =
                err?.response?.data?.message || 'Could not resend code.';
            message.error(msg);

            // Only bail out when the challenge itself is gone.
            if (/session expired/i.test(msg)) {
                setStep('credentials');
                setChallenge('');
                setEmailHint('');
                setResendIn(0);
                clearOtpScratch();
            }
        }
    };

    const backToCredentials = () => {
        setStep('credentials');
        setOtp('');
        setChallenge('');
        setEmailHint('');
        setResendIn(0);
        clearOtpScratch();
        clearError();
    };

    const isDarkMode = isDark;

    return (
        <div
            style={{
                minHeight: '100vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                backgroundColor: isDarkMode ? '#0B0F1A' : '#F8FAFC',
                transition: 'background-color 0.3s ease',
                padding: '24px',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 900,
                    height: '100%',
                    maxHeight: 600,
                    aspectRatio: '3 / 2',
                    display: 'flex',
                    borderRadius: 24,
                    overflow: 'hidden',
                    boxShadow: isDarkMode
                        ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                        : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    transition: 'box-shadow 0.3s ease',
                }}
            >
                {/* ─── LEFT: BRAND PANEL ─────────────────────────── */}
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '32px 36px',
                        background: isDarkMode
                            ? 'linear-gradient(135deg, #0B0F1A 0%, #1E293B 100%)'
                            : 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: `url('/images/rabuyaparking.png')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            opacity: isDarkMode ? 0.25 : 0.35,
                            zIndex: 0,
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: isDarkMode
                                ? 'linear-gradient(135deg, rgba(11,15,26,0.85) 0%, rgba(30,41,59,0.7) 100%)'
                                : 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,58,95,0.7) 100%)',
                            zIndex: 1,
                        }}
                    />

                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            <div
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    background:
                                        'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: 16,
                                    color: '#fff',
                                    boxShadow:
                                        '0 8px 24px rgba(16,185,129,0.35)',
                                }}
                            >
                                R
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 700,
                                        color: '#fff',
                                        letterSpacing: '-0.3px',
                                        lineHeight: 1.2,
                                    }}
                                >
                                    Rabuya
                                </div>
                                <div
                                    style={{
                                        fontSize: 10,
                                        color: 'rgba(255,255,255,0.6)',
                                        letterSpacing: '0.5px',
                                        fontWeight: 500,
                                    }}
                                >
                                    Park & Fuel Management
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            maxWidth: 380,
                        }}
                    >
                        <h1
                            style={{
                                fontSize: 26,
                                fontWeight: 800,
                                color: '#fff',
                                letterSpacing: '-0.8px',
                                lineHeight: 1.2,
                                marginBottom: 12,
                            }}
                        >
                            Manage your parking
                            <br />
                            and fuel operations
                            <span style={{ color: '#10B981' }}>.</span>
                        </h1>
                        <p
                            style={{
                                fontSize: 13,
                                color: 'rgba(255,255,255,0.7)',
                                lineHeight: 1.5,
                                margin: 0,
                                maxWidth: 320,
                            }}
                        >
                            Secure, efficient, and reliable management system
                            for Angel's Fuel Station & Parking Services.
                        </p>

                        <div
                            style={{
                                marginTop: 24,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                            }}
                        >
                            {[
                                '24/7 CCTV Surveillance & Security',
                                'Real-time Parking Slot Monitoring',
                                'Fuel Inventory & Sales Tracking',
                            ].map((item, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: '50%',
                                            background:
                                                'rgba(16,185,129,0.15)',
                                            border:
                                                '1px solid rgba(16,185,129,0.4)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 5,
                                                height: 5,
                                                borderRadius: '50%',
                                                background: '#10B981',
                                            }}
                                        />
                                    </div>
                                    <span
                                        style={{
                                            fontSize: 12,
                                            color: 'rgba(255,255,255,0.75)',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {item}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.4)',
                        }}
                    >
                        © {new Date().getFullYear()} Rabuya · All rights
                        reserved
                    </div>
                </div>

                {/* ─── RIGHT: FORM / OTP ──────────────────────────── */}
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '32px 28px',
                        backgroundColor: isDarkMode ? '#0B0F1A' : '#ffffff',
                        position: 'relative',
                    }}
                >
                    <button
                        onClick={toggleTheme}
                        style={{
                            position: 'absolute',
                            top: 18,
                            right: 20,
                            zIndex: 2,
                            background: isDarkMode ? '#1E293B' : '#F1F5F9',
                            border: isDarkMode
                                ? '1px solid #334155'
                                : '1px solid #E2E8F0',
                            borderRadius: 50,
                            padding: '6px 12px',
                            color: isDarkMode ? '#F1F5F9' : '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 500,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                        {isDarkMode ? 'Light' : 'Dark'}
                    </button>

                    <div style={{ width: '100%', maxWidth: 340 }}>
                        {step === 'credentials' ? (
                            <>
                                <div style={{ marginBottom: 28 }}>
                                    <h2
                                        style={{
                                            fontSize: 24,
                                            fontWeight: 700,
                                            color: isDarkMode
                                                ? '#F1F5F9'
                                                : '#0F172A',
                                            letterSpacing: '-0.4px',
                                            marginBottom: 6,
                                        }}
                                    >
                                        Welcome back
                                    </h2>
                                    <p
                                        style={{
                                            fontSize: 13,
                                            color: isDarkMode
                                                ? '#94A3B8'
                                                : '#64748B',
                                            margin: 0,
                                            fontWeight: 400,
                                        }}
                                    >
                                        Sign in to your admin account to
                                        continue
                                    </p>
                                </div>

                                {error && (
                                    <Alert
                                        message={error}
                                        type="error"
                                        showIcon
                                        style={{
                                            marginBottom: 18,
                                            borderRadius: 10,
                                            fontSize: 12,
                                            padding: '6px 10px',
                                            border: isDarkMode
                                                ? '1px solid #7F1D1D'
                                                : '1px solid #fecaca',
                                            backgroundColor: isDarkMode
                                                ? 'rgba(127,29,29,0.3)'
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
                                    size="middle"
                                >
                                    <Form.Item
                                        name="email"
                                        label={
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: isDarkMode
                                                        ? '#CBD5E1'
                                                        : '#334155',
                                                    letterSpacing: '0.2px',
                                                }}
                                            >
                                                Email Address
                                            </span>
                                        }
                                        rules={[
                                            {
                                                required: true,
                                                message:
                                                    'Please input your email!',
                                            },
                                            {
                                                type: 'email',
                                                message:
                                                    'Please enter a valid email!',
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
                                                            : '#94A3B8',
                                                        marginRight: 4,
                                                        fontSize: 13,
                                                    }}
                                                />
                                            }
                                            placeholder="admin@example.com"
                                            style={{
                                                borderRadius: 10,
                                                height: 42,
                                                borderColor: isDarkMode
                                                    ? '#334155'
                                                    : '#E2E8F0',
                                                background: isDarkMode
                                                    ? '#1E293B'
                                                    : '#F8FAFC',
                                                color: isDarkMode
                                                    ? '#F1F5F9'
                                                    : '#0F172A',
                                                fontSize: 13,
                                            }}
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        name="password"
                                        label={
                                            <span
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: isDarkMode
                                                        ? '#CBD5E1'
                                                        : '#334155',
                                                    letterSpacing: '0.2px',
                                                }}
                                            >
                                                Password
                                            </span>
                                        }
                                        rules={[
                                            {
                                                required: true,
                                                message:
                                                    'Please input your password!',
                                            },
                                        ]}
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Input.Password
                                            prefix={
                                                <LockOutlined
                                                    style={{
                                                        color: isDarkMode
                                                            ? '#64748B'
                                                            : '#94A3B8',
                                                        marginRight: 4,
                                                        fontSize: 13,
                                                    }}
                                                />
                                            }
                                            placeholder="Enter your password"
                                            style={{
                                                borderRadius: 10,
                                                height: 42,
                                                borderColor: isDarkMode
                                                    ? '#334155'
                                                    : '#E2E8F0',
                                                background: isDarkMode
                                                    ? '#1E293B'
                                                    : '#F8FAFC',
                                                color: isDarkMode
                                                    ? '#F1F5F9'
                                                    : '#0F172A',
                                                fontSize: 13,
                                            }}
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        style={{
                                            marginTop: 20,
                                            marginBottom: 0,
                                        }}
                                    >
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            loading={loading}
                                            block
                                            style={{
                                                height: 42,
                                                fontSize: 13.5,
                                                fontWeight: 600,
                                                borderRadius: 10,
                                                backgroundColor: '#10B981',
                                                border: 'none',
                                                boxShadow:
                                                    '0 4px 14px rgba(16,185,129,0.3)',
                                                letterSpacing: '0.2px',
                                            }}
                                        >
                                            {loading ? (
                                                <Spin size="small" />
                                            ) : (
                                                'Sign In'
                                            )}
                                        </Button>
                                    </Form.Item>
                                </Form>

                                <div
                                    style={{
                                        marginTop: 20,
                                        paddingTop: 16,
                                        borderTop: isDarkMode
                                            ? '1px solid #1E293B'
                                            : '1px solid #F1F5F9',
                                        textAlign: 'center',
                                    }}
                                >
                                    <p
                                        style={{
                                            fontSize: 11,
                                            color: isDarkMode
                                                ? '#64748B'
                                                : '#94A3B8',
                                            margin: 0,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        Admin accounts are managed by the
                                        system administrator.
                                        <br />
                                        Contact support if you need assistance.
                                    </p>
                                </div>
                            </>
                        ) : (
                            // ─── OTP STEP ─────────────────────────────
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ marginBottom: 24 }}>
                                    <h2
                                        style={{
                                            fontSize: 22,
                                            fontWeight: 700,
                                            color: isDarkMode
                                                ? '#F1F5F9'
                                                : '#0F172A',
                                            letterSpacing: '-0.4px',
                                            marginBottom: 6,
                                        }}
                                    >
                                        Verify your identity
                                    </h2>
                                    <p
                                        style={{
                                            fontSize: 13,
                                            color: isDarkMode
                                                ? '#94A3B8'
                                                : '#64748B',
                                            margin: 0,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        Enter the 6-digit code sent to{' '}
                                        <strong
                                            style={{
                                                color: isDarkMode
                                                    ? '#F1F5F9'
                                                    : '#0F172A',
                                            }}
                                        >
                                            {emailHint}
                                        </strong>
                                    </p>
                                </div>

                                {error && (
                                    <Alert
                                        message={error}
                                        type="error"
                                        showIcon
                                        style={{
                                            marginBottom: 18,
                                            borderRadius: 10,
                                            fontSize: 12,
                                            padding: '6px 10px',
                                            border: isDarkMode
                                                ? '1px solid #7F1D1D'
                                                : '1px solid #fecaca',
                                            backgroundColor: isDarkMode
                                                ? 'rgba(127,29,29,0.3)'
                                                : '#fef2f2',
                                            textAlign: 'left',
                                        }}
                                        closable
                                        onClose={clearError}
                                    />
                                )}

                                <Input.OTP
                                    length={6}
                                    value={otp}
                                    onChange={(v) => {
                                        setOtp(v);
                                        if (v.length === 6) verifyOtp(v);
                                    }}
                                    size="large"
                                    style={{ width: '100%' }}
                                />

                                <Button
                                    type="primary"
                                    block
                                    loading={loading}
                                    disabled={otp.length !== 6}
                                    onClick={() => verifyOtp()}
                                    style={{
                                        height: 42,
                                        marginTop: 20,
                                        borderRadius: 10,
                                        backgroundColor: '#10B981',
                                        border: 'none',
                                        fontWeight: 600,
                                        fontSize: 13.5,
                                        boxShadow:
                                            '0 4px 14px rgba(16,185,129,0.3)',
                                    }}
                                >
                                    Verify &amp; Sign In
                                </Button>

                                <div
                                    style={{
                                        marginTop: 14,
                                        fontSize: 12,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <Button
                                        type="link"
                                        disabled={resendIn > 0}
                                        onClick={resendOtp}
                                        style={{
                                            color: isDarkMode
                                                ? '#34D399'
                                                : '#059669',
                                            fontSize: 12,
                                            padding: 0,
                                        }}
                                    >
                                        {resendIn > 0
                                            ? `Resend in ${resendIn}s`
                                            : 'Resend code'}
                                    </Button>
                                    <span
                                        style={{
                                            color: isDarkMode
                                                ? '#334155'
                                                : '#CBD5E1',
                                        }}
                                    >
                                        ·
                                    </span>
                                    <Button
                                        type="link"
                                        onClick={backToCredentials}
                                        style={{
                                            color: isDarkMode
                                                ? '#94A3B8'
                                                : '#64748B',
                                            fontSize: 12,
                                            padding: 0,
                                        }}
                                    >
                                        Back
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;