import React, { useState, useEffect } from 'react';
import {
    Table, Button, Modal, Card, Tag, Space, Select, DatePicker,
    message, Spin, Descriptions, Badge,
} from 'antd';
import {
    CheckOutlined, CloseOutlined, EyeOutlined,
    ReloadOutlined, CarOutlined, DollarOutlined,
    ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import api from '../services/api';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Staff {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    employee_id?: string;
}

interface ParkingRemittance {
    id: number;
    staff_id: number;
    staff: Staff;
    remittance_date: string;
    remitted_amount: number;
    actual_sales_amount: number;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_at: string | null;
    created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n ?? 0);

const fmtDate = (d: string | null) =>
    d ? dayjs(d).format('MMM DD, YYYY') : '—';

const fmtDateTime = (d: string | null) =>
    d ? dayjs(d).format('MMM DD, YYYY h:mm A') : '—';

const StatusTag = ({ status }: { status: string }) => {
    const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
        pending:  { color: 'warning',  icon: <ClockCircleOutlined />,  label: 'Pending'  },
        approved: { color: 'success',  icon: <CheckCircleOutlined />,  label: 'Approved' },
        rejected: { color: 'error',    icon: <CloseCircleOutlined />,  label: 'Rejected' },
    };
    const cfg = map[status] ?? map.pending;
    return (
        <Tag icon={cfg.icon} color={cfg.color}>
            {cfg.label}
        </Tag>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

const ParkingRemittances: React.FC = () => {
    const [remittances, setRemittances] = useState<ParkingRemittance[]>([]);
    const [loading, setLoading] = useState(true);
    const [approvingId, setApprovingId] = useState<number | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Detail modal
    const [detailModal, setDetailModal] = useState<ParkingRemittance | null>(null);

    // ── Summary counts ────────────────────────────────────────────────────────
    const pendingCount  = remittances.filter(r => r.status === 'pending').length;
    const approvedCount = remittances.filter(r => r.status === 'approved').length;
    const rejectedCount = remittances.filter(r => r.status === 'rejected').length;

    const totalRemitted  = remittances
        .filter(r => r.status === 'approved')
        .reduce((s, r) => s + Number(r.remitted_amount), 0);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchRemittances = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (dateFrom)     params.append('date_from', dateFrom);
            if (dateTo)       params.append('date_to', dateTo);

            const res = await api.get(`/admin/parking-remittances?${params.toString()}`);
            setRemittances(Array.isArray(res.data) ? res.data : []);
        } catch {
            message.error('Failed to load parking remittances.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRemittances(); }, [statusFilter, dateFrom, dateTo]);

    // ── Approve / Reject ──────────────────────────────────────────────────────
    const handleReview = async (id: number, status: 'approved' | 'rejected') => {
        setApprovingId(id);
        try {
            await api.patch(`/admin/parking-remittances/${id}`, { status });
            message.success(`Parking remittance ${status}.`);
            await fetchRemittances();
            setDetailModal(null);
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to update.');
        } finally {
            setApprovingId(null);
        }
    };

    // ── Variance helper ───────────────────────────────────────────────────────
    const getVariance = (r: ParkingRemittance) => {
        const diff = Number(r.actual_sales_amount) - Number(r.remitted_amount);
        const isMatch = Math.abs(diff) < 0.01;
        if (isMatch) return <Tag color="success">Exact Match ✓</Tag>;
        if (diff > 0)
            return <Tag color="error">Short ₱{diff.toFixed(2)}</Tag>;
        return <Tag color="warning">Over ₱{Math.abs(diff).toFixed(2)}</Tag>;
    };

    // ── Table columns ─────────────────────────────────────────────────────────
    const columns: ColumnsType<ParkingRemittance> = [
        {
            title: 'Staff',
            key: 'staff',
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.staff?.first_name} {r.staff?.last_name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {r.staff?.email}
                    </span>
                </Space>
            ),
        },
        {
            title: 'Date',
            dataIndex: 'remittance_date',
            key: 'date',
            render: (d: string) => fmtDate(d),
        },
        {
            title: 'Remitted Amount',
            dataIndex: 'remitted_amount',
            key: 'remitted',
            align: 'right',
            render: (n: number) => (
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                    {fmtCurrency(n)}
                </span>
            ),
        },
        {
            title: 'Actual Collections',
            dataIndex: 'actual_sales_amount',
            key: 'actual',
            align: 'right',
            render: (n: number) => fmtCurrency(n),
        },
        {
            title: 'Variance',
            key: 'variance',
            align: 'center',
            render: (_, r) => getVariance(r),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (s: string) => <StatusTag status={s} />,
        },
        {
            title: 'Submitted',
            dataIndex: 'created_at',
            key: 'created',
            render: (d: string) => (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {fmtDateTime(d)}
                </span>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 180,
            render: (_, r) => (
                <Space size="small">
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => setDetailModal(r)}
                        style={{ borderRadius: 6 }}
                    >
                        View
                    </Button>
                    {r.status === 'pending' && (
                        <>
                            <Button
                                size="small"
                                type="primary"
                                icon={<CheckOutlined />}
                                loading={approvingId === r.id}
                                onClick={() => handleReview(r.id, 'approved')}
                                style={{
                                    borderRadius: 6,
                                    backgroundColor: '#059669',
                                    borderColor: '#059669',
                                }}
                            >
                                Approve
                            </Button>
                            <Button
                                size="small"
                                danger
                                icon={<CloseOutlined />}
                                loading={approvingId === r.id}
                                onClick={() => handleReview(r.id, 'rejected')}
                                style={{ borderRadius: 6 }}
                            >
                                Reject
                            </Button>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading && remittances.length === 0) {
        return (
            <div className="page-loading">
                <Spin size="large" tip="Loading parking remittances..." />
            </div>
        );
    }

    const statBodyStyle: React.CSSProperties = {
        height: 110,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    };

    return (
        <div>
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <CarOutlined style={{ color: 'var(--primary)', marginRight: 10 }} />
                        Parking Remittances
                    </h1>
                    <p className="page-description">
                        Review and approve daily parking collections submitted by staff.
                    </p>
                </div>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchRemittances}
                    loading={loading}
                    style={{ borderRadius: 6 }}
                >
                    Refresh
                </Button>
            </div>

            {/* Summary stat cards */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <Card className="stat-card stat-card-warning" styles={{ body: statBodyStyle }} style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>
                                Pending
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: '#D97706' }}>
                                {pendingCount}
                            </div>
                        </div>
                        <ClockCircleOutlined style={{ color: '#D97706', fontSize: 22, opacity: 0.8 }} />
                    </div>
                </Card>

                <Card className="stat-card stat-card-success" styles={{ body: statBodyStyle }} style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>
                                Approved
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>
                                {approvedCount}
                            </div>
                        </div>
                        <CheckCircleOutlined style={{ color: 'var(--success)', fontSize: 22, opacity: 0.8 }} />
                    </div>
                </Card>

                <Card className="stat-card stat-card-danger" styles={{ body: statBodyStyle }} style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>
                                Rejected
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--danger)' }}>
                                {rejectedCount}
                            </div>
                        </div>
                        <CloseCircleOutlined style={{ color: 'var(--danger)', fontSize: 22, opacity: 0.8 }} />
                    </div>
                </Card>

                <Card className="stat-card stat-card-success" styles={{ body: statBodyStyle }} style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', fontWeight: 600 }}>
                                Total Approved
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>
                                {fmtCurrency(totalRemitted)}
                            </div>
                        </div>
                        <DollarOutlined style={{ color: 'var(--success)', fontSize: 22, opacity: 0.8 }} />
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 16, borderRadius: 12 }} bodyStyle={{ padding: '12px 16px' }}>
                <Space wrap>
                    <Select
                        placeholder="Filter by Status"
                        style={{ width: 160 }}
                        allowClear
                        onChange={v => setStatusFilter(v ?? '')}
                    >
                        <Select.Option value="pending">Pending</Select.Option>
                        <Select.Option value="approved">Approved</Select.Option>
                        <Select.Option value="rejected">Rejected</Select.Option>
                    </Select>

                    <DatePicker
                        placeholder="Date From"
                        style={{ width: 150 }}
                        onChange={d => setDateFrom(d ? d.format('YYYY-MM-DD') : '')}
                    />

                    <DatePicker
                        placeholder="Date To"
                        style={{ width: 150 }}
                        onChange={d => setDateTo(d ? d.format('YYYY-MM-DD') : '')}
                    />

                    <Button
                        onClick={() => {
                            setStatusFilter('');
                            setDateFrom('');
                            setDateTo('');
                        }}
                        size="small"
                    >
                        Clear Filters
                    </Button>
                </Space>
            </Card>

            {/* Table */}
            <Card style={{ borderRadius: 12 }}>
                {pendingCount > 0 && (
                    <div style={{
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: 8,
                        padding: '10px 14px',
                        marginBottom: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <ClockCircleOutlined style={{ color: '#D97706' }} />
                        <span style={{ color: '#D97706', fontWeight: 600, fontSize: 13 }}>
                            {pendingCount} parking remittance{pendingCount > 1 ? 's' : ''} awaiting your review.
                        </span>
                    </div>
                )}

                <Table
                    columns={columns}
                    dataSource={remittances}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 15, size: 'small', showTotal: total => `${total} records` }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: 'No parking remittances found.' }}
                    rowClassName={r => r.status === 'pending' ? 'row-pending' : ''}
                />
            </Card>

            {/* ── Detail / Review Modal ─────────────────────────────────────── */}
            <Modal
                title={
                    <Space>
                        <CarOutlined style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 600 }}>Parking Remittance Details</span>
                    </Space>
                }
                open={!!detailModal}
                onCancel={() => setDetailModal(null)}
                footer={
                    detailModal?.status === 'pending' ? (
                        <Space>
                            <Button onClick={() => setDetailModal(null)}>Close</Button>
                            <Button
                                danger
                                icon={<CloseOutlined />}
                                loading={approvingId === detailModal?.id}
                                onClick={() => detailModal && handleReview(detailModal.id, 'rejected')}
                            >
                                Reject
                            </Button>
                            <Button
                                type="primary"
                                icon={<CheckOutlined />}
                                loading={approvingId === detailModal?.id}
                                onClick={() => detailModal && handleReview(detailModal.id, 'approved')}
                                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                            >
                                Approve
                            </Button>
                        </Space>
                    ) : (
                        <Button onClick={() => setDetailModal(null)}>Close</Button>
                    )
                }
                width={520}
                destroyOnClose
            >
                {detailModal && (
                    <>
                        <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Staff">
                                <Space direction="vertical" size={0}>
                                    <span style={{ fontWeight: 600 }}>
                                        {detailModal.staff?.first_name} {detailModal.staff?.last_name}
                                    </span>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        {detailModal.staff?.email}
                                    </span>
                                    {detailModal.staff?.employee_id && (
                                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                            ID: {detailModal.staff.employee_id}
                                        </span>
                                    )}
                                </Space>
                            </Descriptions.Item>

                            <Descriptions.Item label="Remittance Date">
                                {fmtDate(detailModal.remittance_date)}
                            </Descriptions.Item>

                            <Descriptions.Item label="Status">
                                <StatusTag status={detailModal.status} />
                            </Descriptions.Item>
                        </Descriptions>

                        {/* Amounts breakdown */}
                        <div style={{
                            background: 'var(--bg-surface-hover)',
                            borderRadius: 10,
                            padding: 16,
                            marginBottom: 16,
                            border: '1px solid var(--border)',
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                                Amount Breakdown
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    Actual Collections (System)
                                </span>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {fmtCurrency(detailModal.actual_sales_amount)}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    Remitted by Staff
                                </span>
                                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--success)' }}>
                                    {fmtCurrency(detailModal.remitted_amount)}
                                </span>
                            </div>

                            <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                    Variance
                                </span>
                                {getVariance(detailModal)}
                            </div>

                            {/* Variance explanation */}
                            {Math.abs(Number(detailModal.actual_sales_amount) - Number(detailModal.remitted_amount)) > 0.01 && (
                                <div style={{
                                    marginTop: 10,
                                    padding: '8px 12px',
                                    background: 'rgba(245,158,11,0.08)',
                                    borderRadius: 8,
                                    border: '1px solid rgba(245,158,11,0.25)',
                                    fontSize: 12,
                                    color: '#D97706',
                                }}>
                                    {Number(detailModal.actual_sales_amount) > Number(detailModal.remitted_amount)
                                        ? `Staff remitted ₱${(Number(detailModal.actual_sales_amount) - Number(detailModal.remitted_amount)).toFixed(2)} less than system records. Verify with staff before approving.`
                                        : `Staff remitted ₱${(Number(detailModal.remitted_amount) - Number(detailModal.actual_sales_amount)).toFixed(2)} more than system records.`
                                    }
                                </div>
                            )}
                        </div>

                        {/* Timeline */}
                        <Descriptions bordered size="small" column={1}>
                            <Descriptions.Item label="Submitted At">
                                {fmtDateTime(detailModal.created_at)}
                            </Descriptions.Item>
                            {detailModal.reviewed_at && (
                                <Descriptions.Item label="Reviewed At">
                                    {fmtDateTime(detailModal.reviewed_at)}
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        {detailModal.status === 'pending' && (
                            <div style={{
                                marginTop: 16,
                                padding: '10px 14px',
                                background: 'rgba(59,130,246,0.08)',
                                borderRadius: 8,
                                border: '1px solid rgba(59,130,246,0.2)',
                                fontSize: 12,
                                color: '#2563EB',
                            }}>
                                ℹ️ Use the <strong>Approve</strong> or <strong>Reject</strong> buttons below to process this remittance.
                            </div>
                        )}
                    </>
                )}
            </Modal>
        </div>
    );
};

export default ParkingRemittances;