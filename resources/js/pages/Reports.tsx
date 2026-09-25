import React, { useState } from 'react';
import {
    Card, Row, Col, Button, DatePicker, Select, Table, message,
    Space, Statistic, Spin, Empty, Tag
} from 'antd';
import {
    FilePdfOutlined,
    FileExcelOutlined,
    PrinterOutlined,
    DollarOutlined,
    CarOutlined,
    FireOutlined,
    ReloadOutlined,
    DownloadOutlined,
    CalendarOutlined,
    FileTextOutlined,
    RiseOutlined,
    FallOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { RangePicker } = DatePicker;
const { Option } = Select;

const PRIMARY_COLOR = '#10B981';
const SECONDARY_COLOR = '#3B82F6';
const WARNING_COLOR = '#F59E0B';
const DANGER_COLOR = '#EF4444';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';

interface ReportData {
    transactions: any[];
    summary: {
        total_revenue: number;
        total_transactions: number;
        average_transaction: number;
        // ✅ Cost & Profit
        total_cost?: number;
        total_profit?: number;
        // Parking
        parking_revenue?: number;
        parking_cost?: number;
        parking_profit?: number;
        // Fuel
        fuel_revenue?: number;
        fuel_cost?: number;
        fuel_profit?: number;
        total_liters_sold?: number;
        total_parking_nights?: number;
        parking_transactions?: number;
        fuel_transactions?: number;
    };
    date_range: {
        start: string;
        end: string;
    };
}

const Reports: React.FC = () => {
    const [reportType, setReportType] = useState<string>('combined');
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [reportData, setReportData] = useState<ReportData | null>(null);

    const generateReport = async () => {
        if (!dateRange) {
            message.warning('Please select date range');
            return;
        }
        setLoading(true);
        try {
            const [start, end] = dateRange;
            const response = await api.get('/reports/generate', {
                params: {
                    type: reportType,
                    start_date: start.format('YYYY-MM-DD'),
                    end_date: end.format('YYYY-MM-DD')
                }
            });
            if (response.data) {
                setReportData(response.data);
                message.success('Report generated successfully');
            } else {
                message.warning('No data found');
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to generate report');
        } finally {
            setLoading(false);
        }
    };


    const exportPDF = () => {
        if (!reportData) {
            message.warning('Please generate a report first');
            return;
        }
        window.print();
        message.success('Choose "Save as PDF" in the print dialog to export');
    };


    const exportExcel = () => {
        if (!reportData) {
            message.warning('Please generate a report first');
            return;
        }

        const { summary, transactions, date_range } = reportData;
        const [start, end] = dateRange ? [date_range.start, date_range.end] : ['', ''];

        // Build CSV content
        let csv = '';

        // Header
        csv += 'Park & Fuel Management System\n';
        csv += `Report Type:,${reportType === 'parking' ? 'Parking' : reportType === 'fuel' ? 'Fuel' : 'Combined'}\n`;
        csv += `Period:,${start} to ${end}\n\n`;

        // Summary
        csv += 'SUMMARY\n';
        csv += `Total Revenue,P${(summary.total_revenue || 0).toFixed(2)}\n`;
        csv += `Total Cost,P${(summary.total_cost || 0).toFixed(2)}\n`;
        csv += `Total Profit,P${(summary.total_profit || 0).toFixed(2)}\n`;
        csv += `Total Transactions,${summary.total_transactions || 0}\n`;
        if (summary.parking_revenue !== undefined) {
            csv += `Parking Revenue,P${summary.parking_revenue.toFixed(2)}\n`;
            csv += `Parking Transactions,${summary.parking_transactions || 0}\n`;
            csv += `Total Nights,${summary.total_parking_nights || 0}\n`;
            csv += `Parking Cost,P${(summary.parking_cost || 0).toFixed(2)}\n`;
            csv += `Parking Profit,P${(summary.parking_profit || 0).toFixed(2)}\n`;
        }
        if (summary.fuel_revenue !== undefined) {
            csv += `Gasoline Revenue,P${summary.fuel_revenue.toFixed(2)}\n`;
            csv += `Gasoline Transactions,${summary.fuel_transactions || 0}\n`;
            csv += `Total Liters,${(summary.total_liters_sold || 0).toFixed(2)} L\n`;
            csv += `Gasoline Cost,P${(summary.fuel_cost || 0).toFixed(2)}\n`;
            csv += `Gasoline Profit,P${(summary.fuel_profit || 0).toFixed(2)}\n`;
        }
        csv += '\n';

        // Transactions
        csv += 'Transaction #,Type,Customer/Product,Quantity,Date,Payment,Paid,Change,Amount\n';

        transactions.forEach((t: any) => {
            const txnNum = (t.transaction_number || 'N/A').replace(/,/g, '');
            const type = t.type === 'parking' ? 'Parking' : 'Gasoline';

            let details = '';
            let quantity = '';
            let date = '';
            let paid = '';
            let change = '';
            let payment = '';

            if (t.type === 'parking') {
                const customerName = t.customer ? `${t.customer.first_name} ${t.customer.last_name}` : 'N/A';
                details = `Slot ${t.slot_number || 'N/A'} - ${customerName}`;
                quantity = `${t.nights_stayed || 0} nights`;
                date = t.check_in_date || '-';
                paid = `P${(t.amount_paid || 0).toFixed(2)}`;
                change = `P${(t.change_amount || 0).toFixed(2)}`;
                payment = (t.payment_method || 'cash').toUpperCase();
            } else {
                const productType = t.fuel_product?.type || 'N/A';
                const customer = t.customer_name ? ` - ${t.customer_name}` : '';
                details = `${productType}${customer}`;
                quantity = `${(t.liters || 0).toFixed(2)} L`;
                date = t.date || '-';
                paid = `P${(t.amount_paid || 0).toFixed(2)}`;
                change = `P${(t.change_amount || 0).toFixed(2)}`;
                payment = (t.payment_method || 'cash').toUpperCase();
            }

            const amount = `P${(t.total_amount || 0).toFixed(2)}`;

            csv += `"${txnNum}","${type}","${details}","${quantity}","${date}","${payment}","${paid}","${change}","${amount}"\n`;
        });

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report_${reportType}_${start}_to_${end}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        message.success('CSV downloaded successfully (open with Excel)');
    };

    const printReport = () => {
        window.print();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
    };

    const formatNumber = (num: number) => {
        return num?.toLocaleString() || '0';
    };

    // ─── Parking columns ────────────────────────────────────────────────────
    const parkingColumns = [
        { title: 'Transaction #', dataIndex: 'transaction_number', key: 'transaction_number', render: (text: string) => <Tag color="blue">{text}</Tag> },
        { title: 'Customer', key: 'customer', render: (_: any, record: any) => record.customer ? `${record.customer.first_name} ${record.customer.last_name}` : 'N/A' },
        { title: 'Slot', dataIndex: 'slot_number', key: 'slot_number', render: (text: string) => <Tag color="purple">{text}</Tag> },
        { title: 'Check In', dataIndex: 'check_in_date', key: 'check_in_date' },
        { title: 'Check Out', dataIndex: 'check_out_date', key: 'check_out_date' },
        { title: 'Nights', dataIndex: 'nights_stayed', key: 'nights', align: 'center' as const, render: (n: number) => <Tag color="green">{n || 1}n</Tag> },
        { title: 'Payment', dataIndex: 'payment_method', key: 'payment_method', render: (m: string) => <Tag>{String(m || 'cash').toUpperCase()}</Tag> },
        { title: 'Paid', dataIndex: 'amount_paid', key: 'amount_paid', align: 'right' as const, render: (a: number) => formatCurrency(a) },
        { title: 'Change', dataIndex: 'change_amount', key: 'change_amount', align: 'right' as const, render: (c: number) => formatCurrency(c) },
        { title: 'Amount', dataIndex: 'total_amount', key: 'amount', align: 'right' as const, render: (a: number) => <span style={{ fontWeight: 600, color: PRIMARY_COLOR }}>{formatCurrency(a)}</span> },
    ];

    // ─── Gasoline columns (with Cost & Profit) ──────────────────────────────
    const fuelColumns = [
        { title: 'Transaction #', dataIndex: 'transaction_number', key: 'transaction_number', render: (text: string) => <Tag color="orange">{text}</Tag> },
        { title: 'Product', key: 'product', render: (_: any, record: any) => record.fuel_product?.type || 'N/A' },
        { title: 'Liters', dataIndex: 'liters', key: 'liters', align: 'right' as const, render: (l: number) => `${formatNumber(l)} L` },
        { title: 'Price/L', dataIndex: 'price_per_liter', key: 'price_per_liter', align: 'right' as const, render: (p: number) => formatCurrency(p) },
        {
            title: 'Cost/L', key: 'cost_per_liter', align: 'right' as const,
            render: (_: any, record: any) => {
                const cost = Number(record.cost_price_per_liter ?? 0);
                return cost > 0 ? formatCurrency(cost) : <span style={{ color: TEXT_SECONDARY }}>—</span>;
            }
        },
        {
            title: 'Cost', key: 'cost', align: 'right' as const,
            render: (_: any, record: any) => {
                const cost = Number(record.total_cost ?? 0);
                return cost > 0 ? <span style={{ color: DANGER_COLOR }}>{formatCurrency(cost)}</span> : <span style={{ color: TEXT_SECONDARY }}>—</span>;
            }
        },
        {
            title: 'Profit', key: 'profit', align: 'right' as const,
            render: (_: any, record: any) => {
                const cost = Number(record.total_cost ?? 0);
                const profit = Number(record.profit ?? (Number(record.total_amount ?? 0) - cost));
                if (cost <= 0) return <span style={{ color: TEXT_SECONDARY }}>—</span>;
                return (
                    <span style={{ fontWeight: 600, color: profit >= 0 ? PRIMARY_COLOR : DANGER_COLOR }}>
                        {formatCurrency(profit)}
                    </span>
                );
            }
        },
        { title: 'Payment', dataIndex: 'payment_method', key: 'payment_method', render: (m: string) => <Tag>{String(m || 'cash').toUpperCase()}</Tag> },
        { title: 'Paid', dataIndex: 'amount_paid', key: 'amount_paid', align: 'right' as const, render: (a: number) => formatCurrency(a) },
        { title: 'Change', dataIndex: 'change_amount', key: 'change_amount', align: 'right' as const, render: (c: number) => formatCurrency(c) },
        { title: 'Total', dataIndex: 'total_amount', key: 'total', align: 'right' as const, render: (a: number) => <span style={{ fontWeight: 600, color: PRIMARY_COLOR }}>{formatCurrency(a)}</span> },
    ];

    // ─── Combined columns (works for both parking + gasoline) ───────────────
    const combinedColumns = [
        {
            title: 'Transaction #',
            dataIndex: 'transaction_number',
            key: 'transaction_number',
            render: (text: string, record: any) => (
                <Tag color={record.type === 'parking' ? 'blue' : 'orange'}>{text}</Tag>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (t: string) =>
                t === 'parking' ? <Tag color="blue">Parking</Tag> : <Tag color="orange">Gasoline</Tag>,
        },
        {
            title: 'Customer / Product',
            key: 'details',
            render: (_: any, record: any) => {
                if (record.type === 'parking') {
                    return record.customer
                        ? `${record.customer.first_name} ${record.customer.last_name}`
                        : 'N/A';
                }
                return record.fuel_product?.type || 'N/A';
            },
        },
        {
            title: 'Quantity',
            key: 'quantity',
            align: 'right' as const,
            render: (_: any, record: any) =>
                record.type === 'parking'
                    ? <Tag color="green">{record.nights_stayed || 1}n</Tag>
                    : `${formatNumber(record.liters)} L`,
        },
        {
            title: 'Date',
            key: 'date',
            render: (_: any, record: any) =>
                record.type === 'parking' ? record.check_in_date : record.date,
        },
        {
            title: 'Cost',
            key: 'cost',
            align: 'right' as const,
            render: (_: any, record: any) => {
                const cost = Number(record.total_cost ?? 0);
                return cost > 0
                    ? <span style={{ color: DANGER_COLOR }}>{formatCurrency(cost)}</span>
                    : <span style={{ color: TEXT_SECONDARY }}>—</span>;
            },
        },
        {
            title: 'Profit',
            key: 'profit',
            align: 'right' as const,
            render: (_: any, record: any) => {
                const cost = Number(record.total_cost ?? 0);
                if (cost <= 0 && record.type === 'parking') {
                    // Parking profit = revenue (no cost basis in schema)
                    const profit = Number(record.profit ?? record.total_amount ?? 0);
                    return (
                        <span style={{ fontWeight: 600, color: profit >= 0 ? PRIMARY_COLOR : DANGER_COLOR }}>
                            {formatCurrency(profit)}
                        </span>
                    );
                }
                if (cost <= 0) return <span style={{ color: TEXT_SECONDARY }}>—</span>;
                const profit = Number(record.profit ?? (Number(record.total_amount ?? 0) - cost));
                return (
                    <span style={{ fontWeight: 600, color: profit >= 0 ? PRIMARY_COLOR : DANGER_COLOR }}>
                        {formatCurrency(profit)}
                    </span>
                );
            },
        },
        {
            title: 'Payment',
            dataIndex: 'payment_method',
            key: 'payment_method',
            render: (m: string) => <Tag>{String(m || 'cash').toUpperCase()}</Tag>,
        },
        { title: 'Paid', dataIndex: 'amount_paid', key: 'amount_paid', align: 'right' as const, render: (a: number) => formatCurrency(a) },
        { title: 'Change', dataIndex: 'change_amount', key: 'change_amount', align: 'right' as const, render: (c: number) => formatCurrency(c) },
        { title: 'Amount', dataIndex: 'total_amount', key: 'amount', align: 'right' as const, render: (a: number) => <span style={{ fontWeight: 600, color: PRIMARY_COLOR }}>{formatCurrency(a)}</span> },
    ];

    const getTransactionsForTable = () => {
        if (!reportData) return [];
        if (reportType === 'parking') return reportData.transactions.filter((t: any) => t.type === 'parking');
        if (reportType === 'fuel') return reportData.transactions.filter((t: any) => t.type === 'fuel');
        return reportData.transactions;
    };

    const getTableColumns = () => {
        if (reportType === 'parking') return parkingColumns;
        if (reportType === 'fuel') return fuelColumns;
        return combinedColumns;
    };

    const reportTypeLabel = reportType === 'parking' ? 'Parking Report' : reportType === 'fuel' ? 'Gasoline Report' : 'Combined Report';

    const renderPrintTransactionRow = (t: any) => {
        if (t.type === 'parking') {
            const customerName = t.customer ? `${t.customer.first_name} ${t.customer.last_name}` : 'N/A';
            return (
                <tr key={`p-${t.id}`}>
                    <td>{t.transaction_number || 'N/A'}</td>
                    <td>Parking</td>
                    <td>{`Slot ${t.slot_number || 'N/A'} — ${customerName}`}</td>
                    <td>{`${t.nights_stayed || 0} night(s)`}</td>
                    <td>{t.check_in_date || '-'}</td>
                    <td>{String(t.payment_method || 'cash').toUpperCase()}</td>
                    <td className="num">{formatCurrency(t.amount_paid)}</td>
                    <td className="num">{formatCurrency(t.change_amount)}</td>
                    <td className="num strong">{formatCurrency(t.total_amount)}</td>
                </tr>
            );
        }
        return (
            <tr key={`f-${t.id}`}>
                <td>{t.transaction_number || 'N/A'}</td>
                <td>Gasoline</td>
                <td>{t.fuel_product?.type || 'N/A'}{t.customer_name ? ` — ${t.customer_name}` : ''}</td>
                <td>{`${formatNumber(t.liters)} L`}</td>
                <td>{t.date || '-'}</td>
                <td>{String(t.payment_method || 'cash').toUpperCase()}</td>
                <td className="num">{formatCurrency(t.amount_paid)}</td>
                <td className="num">{formatCurrency(t.change_amount)}</td>
                <td className="num strong">{formatCurrency(t.total_amount)}</td>
            </tr>
        );
    };

    // Safely extract summary values
    const s = reportData?.summary;
    const hasFuel = s?.fuel_revenue !== undefined;
    const hasParking = s?.parking_revenue !== undefined;

    return (
        <div>
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-report, #printable-report * { visibility: visible; }
                    #printable-report {
                        display: block !important;
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    @page { size: A4; margin: 16mm 14mm; }
                }
                #printable-report { display: none; }
                #printable-report .pr-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 3px solid ${PRIMARY_COLOR};
                    padding-bottom: 14px;
                    margin-bottom: 18px;
                }
                #printable-report .pr-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: ${TEXT_PRIMARY};
                    margin: 0 0 4px 0;
                }
                #printable-report .pr-subtitle {
                    font-size: 12px;
                    color: ${TEXT_SECONDARY};
                    margin: 0;
                }
                #printable-report .pr-meta {
                    text-align: right;
                    font-size: 11px;
                    color: ${TEXT_SECONDARY};
                }
                #printable-report .pr-meta strong {
                    color: ${TEXT_PRIMARY};
                }
                #printable-report .pr-summary {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin-bottom: 20px;
                }
                #printable-report .pr-summary-box {
                    border: 1px solid #E5E7EB;
                    border-radius: 4px;
                    padding: 8px 10px;
                }
                #printable-report .pr-summary-label {
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                    color: ${TEXT_SECONDARY};
                    margin-bottom: 3px;
                }
                #printable-report .pr-summary-value {
                    font-size: 15px;
                    font-weight: 700;
                    color: ${TEXT_PRIMARY};
                }
                #printable-report .pr-section-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: ${TEXT_PRIMARY};
                    margin: 18px 0 8px 0;
                    padding-bottom: 4px;
                    border-bottom: 1px solid #E5E7EB;
                }
                #printable-report table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10.5px;
                }
                #printable-report thead th {
                    background: #F3F4F6;
                    color: ${TEXT_PRIMARY};
                    text-align: left;
                    font-weight: 700;
                    padding: 6px 8px;
                    border-bottom: 2px solid #D1D5DB;
                }
                #printable-report tbody td {
                    padding: 5px 8px;
                    border-bottom: 1px solid #F0F0F0;
                    color: ${TEXT_PRIMARY};
                }
                #printable-report td.num, #printable-report th.num {
                    text-align: right;
                }
                #printable-report td.strong {
                    font-weight: 700;
                    color: ${PRIMARY_COLOR};
                }
                #printable-report tbody tr:nth-child(even) {
                    background: #FAFAFA;
                }
                #printable-report .pr-footer {
                    margin-top: 24px;
                    padding-top: 10px;
                    border-top: 1px solid #E5E7EB;
                    font-size: 9.5px;
                    color: ${TEXT_SECONDARY};
                    display: flex;
                    justify-content: space-between;
                }
            `}</style>

            {reportData && (
                <div id="printable-report">
                    <div className="pr-header">
                        <div>
                            <p className="pr-title">Park &amp; Fuel Management System</p>
                            <p className="pr-subtitle">{reportTypeLabel}</p>
                        </div>
                        <div className="pr-meta">
                            <div><strong>Period:</strong> {reportData.date_range.start} to {reportData.date_range.end}</div>
                            <div><strong>Generated:</strong> {dayjs().format('MMMM D, YYYY h:mm A')}</div>
                        </div>
                    </div>

                    <div className="pr-summary">
                        <div className="pr-summary-box">
                            <div className="pr-summary-label">Total Revenue</div>
                            <div className="pr-summary-value">{formatCurrency(reportData.summary.total_revenue)}</div>
                        </div>
                        <div className="pr-summary-box">
                            <div className="pr-summary-label">Total Cost</div>
                            <div className="pr-summary-value">{formatCurrency(reportData.summary.total_cost ?? 0)}</div>
                        </div>
                        <div className="pr-summary-box">
                            <div className="pr-summary-label">Total Profit</div>
                            <div className="pr-summary-value">{formatCurrency(reportData.summary.total_profit ?? 0)}</div>
                        </div>
                        <div className="pr-summary-box">
                            <div className="pr-summary-label">Total Transactions</div>
                            <div className="pr-summary-value">{formatNumber(reportData.summary.total_transactions)}</div>
                        </div>
                    </div>

                    {reportData.summary.parking_revenue !== undefined && (
                        <div className="pr-summary">
                            <div className="pr-summary-box">
                                <div className="pr-summary-label">Parking Revenue</div>
                                <div className="pr-summary-value">{formatCurrency(reportData.summary.parking_revenue)}</div>
                            </div>
                            <div className="pr-summary-box">
                                <div className="pr-summary-label">Parking Transactions</div>
                                <div className="pr-summary-value">{formatNumber(reportData.summary.parking_transactions || 0)}</div>
                            </div>
                            <div className="pr-summary-box">
                                <div className="pr-summary-label">Total Nights</div>
                                <div className="pr-summary-value">{formatNumber(reportData.summary.total_parking_nights || 0)}</div>
                            </div>
                            <div className="pr-summary-box">
                                <div className="pr-summary-label">Parking Profit</div>
                                <div className="pr-summary-value">{formatCurrency(reportData.summary.parking_profit ?? 0)}</div>
                            </div>
                        </div>
                    )}

                    {reportData.summary.fuel_revenue !== undefined && (
                        <div className="pr-summary">
                            <div className="pr-summary-box">
                                <div className="pr-summary-label">Gasoline Revenue</div>
                                <div className="pr-summary-value">{formatCurrency(reportData.summary.fuel_revenue)}</div>
                            </div>
                            <div className="pr-summary-box">
                                <div className="pr-summary-label">Gasoline Cost</div>
                                <div className="pr-summary-value">{formatCurrency(reportData.summary.fuel_cost ?? 0)}</div>
                            </div>
                            <div className="pr-summary-box">
                                <div className="pr-summary-label">Gasoline Profit</div>
                                <div className="pr-summary-value">{formatCurrency(reportData.summary.fuel_profit ?? 0)}</div>
                            </div>
                            <div className="pr-summary-box">
                                <div className="pr-summary-label">Total Liters Sold</div>
                                <div className="pr-summary-value">{`${(reportData.summary.total_liters_sold || 0).toFixed(2)} L`}</div>
                            </div>
                        </div>
                    )}

                    <div className="pr-section-title">Transaction Details ({getTransactionsForTable().length} records)</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Transaction #</th>
                                <th>Type</th>
                                <th>Customer / Product</th>
                                <th>Quantity</th>
                                <th>Date</th>
                                <th>Payment</th>
                                <th className="num">Paid</th>
                                <th className="num">Change</th>
                                <th className="num">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getTransactionsForTable().map(renderPrintTransactionRow)}
                        </tbody>
                    </table>

                    <div className="pr-footer">
                        <span>Park &amp; Fuel Management System — Generated Report</span>
                        <span>Page 1</span>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title"><FileTextOutlined style={{ color: PRIMARY_COLOR, marginRight: 12 }} />Reports</h1>
                    <p className="page-description">Generate and export business reports for parking and gasoline sales</p>
                </div>
            </div>

            <Card style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]} align="bottom">
                    <Col xs={24} sm={8}>
                        <Select value={reportType} onChange={setReportType} style={{ width: '100%' }} size="large">
                            <Option value="combined">Combined Report</Option>
                            <Option value="parking">Parking Report</Option>
                            <Option value="fuel">Gasoline Report</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={12}>
                        <RangePicker style={{ width: '100%' }} size="large" onChange={(d) => setDateRange(d as any)} />
                    </Col>
                    <Col xs={24} sm={4}>
                        <Button type="primary" size="large" onClick={generateReport} loading={loading} icon={<DownloadOutlined />} style={{ width: '100%' }}>Generate</Button>
                    </Col>
                </Row>
            </Card>

            {reportData && (
                <Card style={{ marginBottom: 24 }}>
                    <Space size="middle">
                        <Button icon={<PrinterOutlined />} onClick={exportPDF} size="large">Print / PDF</Button>
                        <Button icon={<FileExcelOutlined />} onClick={exportExcel} size="large">Export CSV</Button>
                        <Button icon={<ReloadOutlined />} onClick={generateReport} size="large">Refresh</Button>
                    </Space>
                </Card>
            )}

            {/* ─── Grand totals ─── */}
            {reportData && (
                <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic title="Total Revenue" value={reportData.summary.total_revenue} formatter={(v) => formatCurrency(v as number)} valueStyle={{ color: '#065F46', fontSize: 24, fontWeight: 700 }} prefix={<DollarOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic title="Total Cost" value={reportData.summary.total_cost ?? 0} formatter={(v) => formatCurrency(v as number)} valueStyle={{ color: DANGER_COLOR, fontSize: 24, fontWeight: 700 }} prefix={<FallOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic title="Total Profit" value={reportData.summary.total_profit ?? 0} formatter={(v) => formatCurrency(v as number)} valueStyle={{ color: PRIMARY_COLOR, fontSize: 24, fontWeight: 700 }} prefix={<RiseOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic title="Total Transactions" value={reportData.summary.total_transactions} valueStyle={{ color: '#1E40AF', fontSize: 24, fontWeight: 700 }} />
                        </Card>
                    </Col>
                </Row>
            )}

            {/* ─── Gasoline summary ─── */}
            {reportData && hasFuel && (
                <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Gasoline Revenue"
                                value={reportData.summary.fuel_revenue}
                                formatter={(v) => formatCurrency(v as number)}
                                valueStyle={{ color: '#C2410C', fontSize: 24, fontWeight: 700 }}
                                prefix={<FireOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Gasoline Cost"
                                value={reportData.summary.fuel_cost ?? 0}
                                formatter={(v) => formatCurrency(v as number)}
                                valueStyle={{ color: DANGER_COLOR, fontSize: 24, fontWeight: 700 }}
                                prefix={<FallOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Gasoline Profit"
                                value={reportData.summary.fuel_profit ?? 0}
                                formatter={(v) => formatCurrency(v as number)}
                                valueStyle={{ color: PRIMARY_COLOR, fontSize: 24, fontWeight: 700 }}
                                prefix={<RiseOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Total Liters Sold"
                                value={reportData.summary.total_liters_sold || 0}
                                suffix="L"
                                precision={2}
                                valueStyle={{ color: '#C2410C', fontSize: 24, fontWeight: 700 }}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            {/* ─── Parking summary ─── */}
            {reportData && hasParking && (
                <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Parking Revenue"
                                value={reportData.summary.parking_revenue}
                                formatter={(v) => formatCurrency(v as number)}
                                valueStyle={{ color: '#1D4ED8', fontSize: 24, fontWeight: 700 }}
                                prefix={<CarOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Parking Cost"
                                value={reportData.summary.parking_cost ?? 0}
                                formatter={(v) => formatCurrency(v as number)}
                                valueStyle={{ color: DANGER_COLOR, fontSize: 24, fontWeight: 700 }}
                                prefix={<FallOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Parking Profit"
                                value={reportData.summary.parking_profit ?? reportData.summary.parking_revenue ?? 0}
                                formatter={(v) => formatCurrency(v as number)}
                                valueStyle={{ color: PRIMARY_COLOR, fontSize: 24, fontWeight: 700 }}
                                prefix={<RiseOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card>
                            <Statistic
                                title="Total Parking Nights"
                                value={reportData.summary.total_parking_nights || 0}
                                valueStyle={{ color: '#1D4ED8', fontSize: 24, fontWeight: 700 }}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            {reportData && (
                <Card title={<Space><FileTextOutlined style={{ color: PRIMARY_COLOR }} /><span>Transaction Details</span><Tag color="blue">{getTransactionsForTable().length} records</Tag></Space>}>
                    <Table columns={getTableColumns()} dataSource={getTransactionsForTable()} rowKey="id" pagination={{ pageSize: 10 }} loading={loading} scroll={{ x: 'max-content' }} />
                </Card>
            )}

            {!reportData && !loading && (
                <Card style={{ textAlign: 'center', padding: 40 }}>
                    <FileTextOutlined style={{ fontSize: 64, color: TEXT_SECONDARY, marginBottom: 16 }} />
                    <h3>No Report Generated</h3>
                    <p style={{ color: TEXT_SECONDARY }}>Select report type and date range, then click Generate.</p>
                </Card>
            )}

            {loading && <Card style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></Card>}
        </div>
    );
};

export default Reports;