import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import RoundupForm from "./pages/RoundupForm";
import Results from "./pages/Results";
import History from "./pages/History";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/roundup" component={RoundupForm} />
      <Route path="/results/:id" component={Results} />
      <Route path="/history" component={History} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster 
            position="top-center"
            toastOptions={{
              style: {
                background: 'oklch(0.15 0.02 280)',
                border: '1px solid oklch(0.28 0.03 280)',
                color: 'oklch(0.95 0.01 280)',
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
