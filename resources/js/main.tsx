// resources/js/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, theme as antdTheme } from "antd";
import App from "./App";
import "../css/app.css";
import api from "./services/api";

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30000,
        },
    },
});

// ─── THEME DETECTION ──────────────────────────────────────────────────────────

const getIsDark = () => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return document.documentElement.getAttribute("data-theme") === "dark";
};

const isDark = getIsDark();

// Apply theme to body
document.body.style.backgroundColor = isDark ? "#0F172A" : "#F8FAFC";

// ─── ANT DESIGN THEME CONFIGURATION ──────────────────────────────────────────

const getAntdTheme = (dark: boolean) => {
    return {
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
            colorPrimary: "#10B981",
            colorSuccess: "#10B981",
            colorWarning: "#F59E0B",
            colorError: "#EF4444",
            colorInfo: "#3B82F6",
            borderRadius: 8,
            fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            ...(dark
                ? {
                      colorBgBase: "#0F172A",
                      colorBgContainer: "#1E293B",
                      colorBgElevated: "#1E293B",
                      colorBgLayout: "#0F172A",
                      colorBgSpotlight: "#1E293B",
                      colorText: "#F1F5F9",
                      colorTextBase: "#F1F5F9",
                      colorTextSecondary: "#94A3B8",
                      colorTextTertiary: "#64748B",
                      colorBorder: "#334155",
                      colorBorderSecondary: "#1E293B",
                      colorPrimaryBg: "#064E3B",
                      colorPrimaryBgHover: "#065F46",
                      colorPrimaryBorder: "#10B981",
                      colorPrimaryHover: "#34D399",
                      colorSuccessBg: "#064E3B",
                      colorSuccessBorder: "#065F46",
                      colorErrorBg: "#7F1D1D",
                      colorErrorBorder: "#991B1B",
                      colorWarningBg: "#78350F",
                      colorWarningBorder: "#92400E",
                      colorInfoBg: "#1E3A5F",
                      colorInfoBorder: "#1E40AF",
                      controlItemBgActive: "#064E3B",
                      controlItemBgHover: "#1E293B",
                      controlItemBgActiveHover: "#065F46",
                  }
                : {
                      colorBgBase: "#FFFFFF",
                      colorBgContainer: "#FFFFFF",
                      colorBgElevated: "#FFFFFF",
                      colorBgLayout: "#F8FAFC",
                      colorBgSpotlight: "#FFFFFF",
                      colorText: "#0F172A",
                      colorTextBase: "#0F172A",
                      colorTextSecondary: "#475569",
                      colorTextTertiary: "#94A3B8",
                      colorBorder: "#E2E8F0",
                      colorBorderSecondary: "#F1F5F9",
                      colorPrimaryBg: "#ECFDF5",
                      colorPrimaryBgHover: "#D1FAE5",
                      colorPrimaryBorder: "#A7F3D0",
                      colorPrimaryHover: "#059669",
                      colorSuccessBg: "#ECFDF5",
                      colorSuccessBorder: "#A7F3D0",
                      colorErrorBg: "#FEF2F2",
                      colorErrorBorder: "#FCA5A5",
                      colorWarningBg: "#FEF3C7",
                      colorWarningBorder: "#FDE68A",
                      colorInfoBg: "#EFF6FF",
                      colorInfoBorder: "#BFDBFE",
                      controlItemBgActive: "#ECFDF5",
                      controlItemBgHover: "#F1F5F9",
                      controlItemBgActiveHover: "#D1FAE5",
                  }),
        },
        components: {
            Button: {
                borderRadius: 8,
                controlHeight: 38,
                controlHeightSM: 32,
                controlHeightLG: 44,
                ...(dark
                    ? {
                          colorBgContainer: "#1E293B",
                          colorBorder: "#334155",
                          colorText: "#F1F5F9",
                          colorTextSecondary: "#94A3B8",
                      }
                    : {}),
            },
            Card: {
                borderRadiusLG: 12,
                ...(dark
                    ? {
                          colorBgContainer: "#1E293B",
                          colorBorder: "#334155",
                      }
                    : {
                          colorBgContainer: "#FFFFFF",
                          colorBorder: "#E2E8F0",
                      }),
            },
            Table: {
                borderRadius: 12,
                ...(dark
                    ? {
                          colorBgContainer: "#1E293B",
                          colorBgBody: "#1E293B",
                          colorBgHeader: "#0F172A",
                          colorBorder: "#334155",
                          colorText: "#F1F5F9",
                          headerBg: "#0F172A",
                          headerColor: "#94A3B8",
                          headerBorderRadius: 12,
                      }
                    : {
                          colorBgContainer: "#FFFFFF",
                          colorBgBody: "#FFFFFF",
                          colorBgHeader: "#F8FAFC",
                          colorBorder: "#E2E8F0",
                          colorText: "#0F172A",
                          headerBg: "#F8FAFC",
                          headerColor: "#475569",
                          headerBorderRadius: 12,
                      }),
            },
            Modal: {
                borderRadiusLG: 16,
                ...(dark
                    ? {
                          colorBgElevated: "#1E293B",
                          colorBgMask: "rgba(0,0,0,0.75)",
                          colorBorder: "#334155",
                          colorText: "#F1F5F9",
                      }
                    : {
                          colorBgElevated: "#FFFFFF",
                          colorBgMask: "rgba(0,0,0,0.45)",
                          colorBorder: "#E2E8F0",
                          colorText: "#0F172A",
                      }),
            },
            Input: {
                borderRadius: 8,
                ...(dark
                    ? {
                          colorBgContainer: "#1E293B",
                          colorBorder: "#334155",
                          colorText: "#F1F5F9",
                          colorPlaceholder: "#64748B",
                      }
                    : {
                          colorBgContainer: "#F8FAFC",
                          colorBorder: "#E2E8F0",
                          colorText: "#0F172A",
                          colorPlaceholder: "#94A3B8",
                      }),
            },
            Select: {
                borderRadius: 8,
                ...(dark
                    ? {
                          colorBgContainer: "#1E293B",
                          colorBorder: "#334155",
                          colorText: "#F1F5F9",
                          optionSelectedBg: "#064E3B",
                      }
                    : {
                          colorBgContainer: "#F8FAFC",
                          colorBorder: "#E2E8F0",
                          colorText: "#0F172A",
                          optionSelectedBg: "#ECFDF5",
                      }),
            },
            DatePicker: {
                borderRadius: 8,
                ...(dark
                    ? {
                          colorBgContainer: "#1E293B",
                          colorBorder: "#334155",
                          colorText: "#F1F5F9",
                      }
                    : {
                          colorBgContainer: "#F8FAFC",
                          colorBorder: "#E2E8F0",
                          colorText: "#0F172A",
                      }),
            },
            Tag: {
                borderRadius: 6,
                ...(dark
                    ? {
                          colorText: "#F1F5F9",
                          colorBg: "#1E293B",
                      }
                    : {
                          colorText: "#0F172A",
                          colorBg: "#F8FAFC",
                      }),
            },
            Tabs: {
                ...(dark
                    ? {
                          colorText: "#94A3B8",
                          colorTextActive: "#34D399",
                          colorBorder: "#334155",
                      }
                    : {
                          colorText: "#475569",
                          colorTextActive: "#10B981",
                          colorBorder: "#E2E8F0",
                      }),
            },
            Popover: {
                borderRadius: 12,
                ...(dark
                    ? {
                          colorBgElevated: "#1E293B",
                          colorBorder: "#334155",
                          colorText: "#F1F5F9",
                      }
                    : {
                          colorBgElevated: "#FFFFFF",
                          colorBorder: "#E2E8F0",
                          colorText: "#0F172A",
                      }),
            },
            Dropdown: {
                borderRadius: 12,
                ...(dark
                    ? {
                          colorBgElevated: "#1E293B",
                          colorBorder: "#334155",
                          colorText: "#F1F5F9",
                      }
                    : {
                          colorBgElevated: "#FFFFFF",
                          colorBorder: "#E2E8F0",
                          colorText: "#0F172A",
                      }),
            },
            Badge: {
                ...(dark
                    ? {
                          colorText: "#F1F5F9",
                      }
                    : {}),
            },
            Alert: {
                borderRadius: 8,
                ...(dark
                    ? {
                          colorText: "#F1F5F9",
                          colorBorder: "#334155",
                      }
                    : {
                          colorText: "#0F172A",
                          colorBorder: "#E2E8F0",
                      }),
            },
            Descriptions: {
                ...(dark
                    ? {
                          colorBgContainer: "#1E293B",
                          colorBorder: "#334155",
                          colorText: "#F1F5F9",
                      }
                    : {
                          colorBgContainer: "#FFFFFF",
                          colorBorder: "#E2E8F0",
                          colorText: "#0F172A",
                      }),
            },
            List: {
                ...(dark
                    ? {
                          colorBgContainer: "#1E293B",
                          colorText: "#F1F5F9",
                      }
                    : {
                          colorBgContainer: "#FFFFFF",
                          colorText: "#0F172A",
                      }),
            },
            Space: {
                ...(dark
                    ? {
                          colorText: "#F1F5F9",
                      }
                    : {
                          colorText: "#0F172A",
                      }),
            },
            Typography: {
                ...(dark
                    ? {
                          colorText: "#F1F5F9",
                          colorTextSecondary: "#94A3B8",
                      }
                    : {
                          colorText: "#0F172A",
                          colorTextSecondary: "#475569",
                      }),
            },
        },
    };
};

ReactDOM.createRoot(document.getElementById("app")!).render(
    <React.StrictMode>
        <ConfigProvider theme={getAntdTheme(isDark)}>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </QueryClientProvider>
        </ConfigProvider>
    </React.StrictMode>,
);

// ─── THEME CHANGE LISTENER ────────────────────────────────────────────────────

// Listen for theme changes and update Ant Design config
const observer = new MutationObserver(() => {
    const isDarkNow =
        document.documentElement.getAttribute("data-theme") === "dark";
    // Dispatch custom event for App component
    window.dispatchEvent(
        new CustomEvent("theme-change", {
            detail: { isDark: isDarkNow },
        }),
    );
});

observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
});

// Also listen for localStorage changes
window.addEventListener("storage", (e) => {
    if (e.key === "theme") {
        const isDarkNow = e.newValue === "dark";
        window.dispatchEvent(
            new CustomEvent("theme-change", {
                detail: { isDark: isDarkNow },
            }),
        );
    }
});
