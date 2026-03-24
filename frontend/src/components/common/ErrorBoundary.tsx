import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // In production you'd send this to a monitoring service like Sentry
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#0d0d0f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
              backgroundColor: "#1a1a1f",
              border: "1px solid #2a2a30",
              borderRadius: "1rem",
              padding: "2.5rem",
              textAlign: "center",
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 59, 59, 0.1)",
                border: "1px solid rgba(255, 59, 59, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FF3B3B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            {/* Heading */}
            <h1
              style={{
                fontSize: "1.375rem",
                fontWeight: "700",
                color: "#e8e6e0",
                marginBottom: "0.75rem",
                lineHeight: "1.3",
              }}
            >
              Something went wrong
            </h1>

            {/* Description */}
            <p
              style={{
                fontSize: "0.9rem",
                color: "#6b6872",
                lineHeight: "1.6",
                marginBottom: "0.5rem",
              }}
            >
              An unexpected error occurred in the application. This has been
              noted. You can try reloading the page or going back.
            </p>

            {/* Error message (collapsed, dev-friendly) */}
            {this.state.error && (
              <details
                style={{
                  textAlign: "left",
                  marginBottom: "2rem",
                  marginTop: "1.25rem",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    color: "#6b6872",
                    userSelect: "none",
                    marginBottom: "0.5rem",
                  }}
                >
                  Error details
                </summary>
                <div
                  style={{
                    backgroundColor: "rgba(255,59,59,0.05)",
                    border: "1px solid rgba(255,59,59,0.2)",
                    borderRadius: "0.5rem",
                    padding: "0.875rem",
                    overflowX: "auto",
                  }}
                >
                  <pre
                    style={{
                      fontSize: "0.7rem",
                      color: "#FF3B3B",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: "'JetBrains Mono', monospace",
                      margin: 0,
                    }}
                  >
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack
                      ? `\n\nComponent Stack:${this.state.errorInfo.componentStack}`
                      : ""}
                  </pre>
                </div>
              </details>
            )}

            {/* Actions */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                marginTop: this.state.error ? "0" : "2rem",
              }}
            >
              {/* Primary: Reload */}
              <button
                onClick={this.handleReload}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  width: "100%",
                  height: "2.75rem",
                  backgroundColor: "#FF5C2B",
                  border: "1px solid #FF5C2B",
                  borderRadius: "0.75rem",
                  color: "#ffffff",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  fontFamily: "'Syne', sans-serif",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#e64d20";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FF5C2B";
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Reload Page
              </button>

              {/* Secondary: Try reset without reload */}
              <button
                onClick={this.handleReset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "2.75rem",
                  backgroundColor: "transparent",
                  border: "1px solid #2a2a30",
                  borderRadius: "0.75rem",
                  color: "#6b6872",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  fontFamily: "'Syne', sans-serif",
                  cursor: "pointer",
                  transition: "border-color 0.15s ease, color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.borderColor = "#3a3a42";
                  btn.style.color = "#e8e6e0";
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.borderColor = "#2a2a30";
                  btn.style.color = "#6b6872";
                }}
              >
                Try again without reloading
              </button>

              {/* Tertiary: Go home */}
              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.375rem",
                  width: "100%",
                  height: "2rem",
                  backgroundColor: "transparent",
                  border: "none",
                  color: "#6b6872",
                  fontSize: "0.8rem",
                  fontFamily: "'Syne', sans-serif",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "#FF5C2B";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "#6b6872";
                }}
              >
                ← Go to homepage
              </a>
            </div>

            {/* Footer note */}
            <p
              style={{
                marginTop: "2rem",
                fontSize: "0.7rem",
                color: "#3a3a42",
              }}
            >
              PayVault — Error boundary caught
            </p>
          </div>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}

export default ErrorBoundary;
