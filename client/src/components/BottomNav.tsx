import { useLocation, Link } from 'wouter';
import { Home, Plus, Palette, BarChart3, MoreHorizontal } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/crucible/intake', label: 'Intake', icon: Plus },
  { path: '/crucible/works', label: 'Works', icon: Palette },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/more', label: 'More', icon: MoreHorizontal },
];

// More menu items
const MORE_ITEMS = [
  { path: '/materials', label: 'Materials Library' },
  { path: '/history', label: 'History & Trends' },
  { path: '/roundup', label: 'Weekly Roundup' },
  { path: '/settings', label: 'Settings' },
];

export default function BottomNav() {
  const [location] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  
  // Get this week's trial count for badge
  const { data: nextCodeData } = trpc.works.getNextCode.useQuery();
  
  // Determine active path
  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    if (path === '/more') {
      return MORE_ITEMS.some(item => location.startsWith(item.path));
    }
    return location.startsWith(path);
  };
  
  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-16 left-0 right-0 bg-gray-950 border-t border-gray-800 pb-safe">
            <div className="max-w-lg mx-auto py-2">
              {MORE_ITEMS.map((item) => (
                <Link key={item.path} href={item.path}>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className={`w-full text-left px-6 py-3 text-sm transition-colors ${
                      location.startsWith(item.path)
                        ? 'text-cyan-400 bg-cyan-500/10'
                        : 'text-gray-300 hover:bg-gray-800/50'
                    }`}
                  >
                    {item.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-sm border-t border-gray-800" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            if (item.path === '/more') {
              return (
                <button
                  key={item.path}
                  onClick={() => setMoreOpen(!moreOpen)}
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px] transition-colors ${
                    active || moreOpen
                      ? 'text-cyan-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px]">{item.label}</span>
                </button>
              );
            }
            
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={`flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px] transition-colors relative ${
                    active
                      ? 'text-cyan-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={active ? { textShadow: '0 0 8px rgba(0, 240, 255, 0.5)' } : undefined}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px]">{item.label}</span>
                  {/* Badge for intake: show total trial count */}
                  {item.path === '/crucible/intake' && nextCodeData?.count !== undefined && nextCodeData.count > 0 && (
                    <span className="absolute -top-0.5 right-1 bg-magenta-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {nextCodeData.count}
                    </span>
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
