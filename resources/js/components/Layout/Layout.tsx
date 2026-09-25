// resources/js/components/Layout/Layout.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
    children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    /**
     * `collapsed` = current visual state of the sidebar
     * `pinned`    = user clicked the toggle button, so we should NOT
     *               auto-collapse when the mouse leaves
     */
    const [collapsed, setCollapsed] = useState(false);
    const [pinned, setPinned] = useState(false);

    // Track whether the mouse is currently over the sidebar
    const hoverRef = useRef(false);

    // ─── Manual toggle (click) ─────────────────────────────────────────────
    const toggleSidebar = () => {
        // Toggle pinned state and set collapsed to the opposite of pinned
        const nextPinned = !pinned;
        setPinned(nextPinned);

        // When unpinning, keep whatever the mouse state says
        if (nextPinned) {
            setCollapsed(false); // pinned → force expanded
        } else if (!hoverRef.current) {
            setCollapsed(true); // unpinned + mouse away → collapse
        }
    };

    // ─── Mouse enter ───────────────────────────────────────────────────────
    const handleMouseEnter = () => {
        hoverRef.current = true;
        if (!pinned) {
            setCollapsed(false);
        }
    };

    // ─── Mouse leave ───────────────────────────────────────────────────────
    const handleMouseLeave = () => {
        hoverRef.current = false;
        if (!pinned) {
            setCollapsed(true);
        }
    };

    // ─── Sync background with theme ────────────────────────────────────────
    useEffect(() => {
        const isDark =
            localStorage.getItem('theme') === 'dark' ||
            document.documentElement.getAttribute('data-theme') === 'dark';
        document.body.style.backgroundColor = isDark ? '#0F172A' : '#F8FAFC';
    }, []);

    return (
        <div className="app">
            <Sidebar
                collapsed={collapsed}
                onToggle={toggleSidebar}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                pinned={pinned}
            />
            <div className={`main-content ${collapsed ? 'collapsed' : ''}`}>
                <Header />
                <div className="content fade-in">
                    {children || <Outlet />}
                </div>
            </div>
        </div>
    );
};

export default Layout;