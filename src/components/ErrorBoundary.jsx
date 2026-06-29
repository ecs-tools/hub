import React from "react";

/**
 * Wraps a module subtree. If the subtree throws a JavaScript error,
 * renders a fallback card instead of crashing the whole app.
 *
 * Props:
 *   moduleName {string} – displayed in the fallback UI
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(
      `ErrorBoundary caught error in "${this.props.moduleName}":`,
      error,
      info
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: "white",
          color: "#1e293b",
          border: "1.5px solid #e2e8f0",
          borderRadius: 12,
          padding: 32,
          margin: 24,
          maxWidth: 600,
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#dc2626",
            marginBottom: 8,
          }}>
            {this.props.moduleName}
          </div>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#1e293b",
            marginBottom: 8,
          }}>
            Something went wrong in this module
          </div>
          <div style={{
            fontSize: 13,
            color: "#64748b",
            marginBottom: 24,
          }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#1e293b",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
