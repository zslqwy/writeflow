import { useFileStore } from '../store/useFileStore';
export function Dashboard() {
    const { files } = useFileStore();
    const fileCount = Object.values(files).filter(f => f.type === 'file').length;

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <header className="mb-12">
                <h2 className="text-4xl font-serif font-bold text-white mb-2">Good evening, Writer.</h2>
                <p className="text-gray-400">Ready to continue your story?</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="p-6 rounded-2xl glass hover:bg-white/5 transition-colors cursor-default group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-accent-primary transition-colors">Daily Target</h3>
                        <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary">
                            <span className="text-xs">🎯</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">0 <span className="text-sm font-normal text-gray-500">/ 500</span></p>
                    <div className="w-full bg-white/5 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-accent-primary h-full w-[0%]"></div>
                    </div>
                </div>
                <div className="p-6 rounded-2xl glass hover:bg-white/5 transition-colors cursor-default group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-accent-secondary transition-colors">Total Words</h3>
                        <div className="w-8 h-8 rounded-full bg-accent-secondary/20 flex items-center justify-center text-accent-secondary">
                            <span className="text-xs">📝</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">170</p>
                    <p className="text-xs text-gray-500 mt-2">Across {fileCount} documents</p>
                </div>
                <div className="p-6 rounded-2xl glass hover:bg-white/5 transition-colors cursor-default group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-green-400 transition-colors">Streak</h3>
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                            <span className="text-xs">🔥</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">1 <span className="text-sm font-normal text-gray-500">day</span></p>
                    <p className="text-xs text-gray-500 mt-2">Keep the momentum going!</p>
                </div>
            </div>
            <section>
                <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    Recent Projects
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mock Recent Items */}
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer group">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-200 group-hover:text-accent-primary transition-colors">My Novel</h4>
                            <span className="text-xs text-gray-500">updated 2h ago</span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">It was a dark and stormy night...</p>
                    </div>
                </div>
            </section>
        </div>
    )
}
