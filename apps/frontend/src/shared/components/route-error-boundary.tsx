import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export class ViewErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('View rendering failed', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <section role="alert" className="space-y-3 p-6">
      <h1 className="text-lg font-semibold">This view could not be displayed</h1>
      <p className="text-sm text-muted-foreground">Reload to retry with your current investigation filters.</p>
      <Button onClick={() => window.location.reload()}>Reload view</Button>
    </section>;
  }
}

export function RouteErrorBoundary({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  return <ViewErrorBoundary key={pathname}>{children}</ViewErrorBoundary>;
}
