import { Component } from 'react';
import { ErrorState } from './panel';

export class ErrorBoundary extends Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    render() {
        if (this.state.failed) {
            return <main className="mx-auto w-full max-w-xl p-4"><ErrorState message="This page could not be displayed. Reload to try again. Your saved server data is unchanged." onRetry={() => window.location.reload()} /></main>;
        }
        return this.props.children;
    }
}
