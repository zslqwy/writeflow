import { useFileStore } from '../store/useFileStore';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Calendar, Target } from 'lucide-react';
import { cn } from '../lib/utils'; // Assuming cn utility is available or just use template literals

export function Dashboard() {
    const { files, openFile } = useFileStore();
    const navigate = useNavigate();

    // Get stats
    const fileList = Object.values(files).filter(f => f.type === 'file');
    const totalWords = fileList.reduce((acc, f) => acc + (f.metadata?.wordCount || 0), 0);
    const fileCount = fileList.length;

    // Get active plans: files with target word count or deadline, excluding completed ones (optional)
    const activePlans = fileList.filter(f =>
        (f.metadata?.targetWordCount || f.metadata?.deadline) &&
        f.metadata?.status !== 'completed'
    );

    // Calculate progress for a file
    const getProgress = (current: number, target?: number) => {
        if (!target || target === 0) return 0;
        return Math.min(100, Math.round((current / target) * 100));
    };

    // Calculate days remaining
    const getDaysRemaining = (deadline?: number) => {
        if (!deadline) return null;
        const now = Date.now();
        const diff = deadline - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    const handleOpenFile = (id: string) => {
        openFile(id);
        navigate(`/editor/${id}`);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500">
            <header className="mb-12">
                <h2 className="text-4xl font-serif font-bold text-white mb-2">Good evening, Writer.</h2>
                <p className="text-gray-400">Ready to continue your story?</p>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Daily Target (Mock for now, could be stored in user settings) */}
                <div className="p-6 rounded-2xl glass hover:bg-white/5 transition-colors cursor-default group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-accent-primary transition-colors">Daily Target</h3>
                        <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary">
                            <Target size={14} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">0 <span className="text-sm font-normal text-gray-500">/ 500</span></p>
                    <div className="w-full bg-white/5 h-1.5 mt-4 rounded-full overflow-hidden">
                        <div className="bg-accent-primary h-full w-[0%]"></div>
                    </div>
                </div>

                {/* Total Words */}
                <div className="p-6 rounded-2xl glass hover:bg-white/5 transition-colors cursor-default group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-accent-secondary transition-colors">Total Words</h3>
                        <div className="w-8 h-8 rounded-full bg-accent-secondary/20 flex items-center justify-center text-accent-secondary">
                            <span className="text-xs">📝</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{totalWords.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">Across {fileCount} documents</p>
                </div>

                {/* Active Plans Count */}
                <div className="p-6 rounded-2xl glass hover:bg-white/5 transition-colors cursor-default group">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-green-400 transition-colors">Active Plans</h3>
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                            <Calendar size={14} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{activePlans.length}</p>
                    <p className="text-xs text-gray-500 mt-2">Projects in progress</p>
                </div>
            </div>

            {/* Plan Management / Recent Active Works */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
                        Active Writing Plans
                    </h3>
                    {/* Add Filter? */}
                </div>

                {activePlans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activePlans.map(file => {
                            const progress = getProgress(file.metadata?.wordCount || 0, file.metadata?.targetWordCount);
                            const daysLeft = getDaysRemaining(file.metadata?.deadline);

                            return (
                                <div
                                    key={file.id}
                                    onClick={() => handleOpenFile(file.id)}
                                    className="p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/5 rounded-lg text-accent-primary">
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-200 group-hover:text-white transition-colors">{file.name}</h4>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                    {/* Status Badge */}
                                                    {file.metadata?.status && (
                                                        <span className={cn(
                                                            "px-1.5 py-0.5 rounded-full capitalize",
                                                            file.metadata.status === 'writing' && "bg-blue-500/10 text-blue-400",
                                                            file.metadata.status === 'brainstorming' && "bg-yellow-500/10 text-yellow-400"
                                                        )}>
                                                            {file.metadata.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Days Remaining Badge */}
                                        {daysLeft !== null && (
                                            <div className={cn(
                                                "text-xs px-2 py-1 rounded-md border",
                                                daysLeft < 0 ? "border-red-500/20 bg-red-500/10 text-red-400" :
                                                    daysLeft <= 3 ? "border-orange-500/20 bg-orange-500/10 text-orange-400" :
                                                        "border-white/5 bg-white/5 text-gray-400"
                                            )}>
                                                {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    {file.metadata?.targetWordCount ? (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>Progress</span>
                                                <span>{file.metadata.wordCount} / {file.metadata.targetWordCount} ({progress}%)</span>
                                            </div>
                                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full transition-all duration-500",
                                                        progress >= 100 ? "bg-green-500" : "bg-accent-primary"
                                                    )}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4 text-xs text-gray-500">
                                            {file.metadata?.wordCount} words written
                                        </div>
                                    )}

                                    <div className="absolute bottom-4 right-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                        <ArrowRight size={16} className="text-white" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                        <p className="text-gray-500 mb-2">No active plans.</p>
                        <p className="text-sm text-gray-600">Set a target or deadline for your files to see them here.</p>
                    </div>
                )}
            </section>
        </div>
    )
}
