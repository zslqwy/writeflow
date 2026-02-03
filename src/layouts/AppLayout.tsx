import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
export function AppLayout() {
    return (
        <div className="flex h-screen w-full overflow-hidden text-gray-200 font-sans selection:bg-accent-primary/30 selection:text-white">
            <Sidebar />
            <main className="flex-1 overflow-hidden relative flex flex-col">
                {/* Top bar or other elements could go here */}
                <div className="flex-1 overflow-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
