import { ChevronRight, Newspaper, Calendar, MessageSquare } from "lucide-react";

export default function GamePageLoading() {
    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                
                {/* Posible bloque Meta de Armas (solo visualizado condicionalmente en la realidad, pero lo ponemos discreto) */}
                <div className="mb-16 px-2 animate-pulse">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-[2px] bg-teal-500/30" />
                                <div className="h-3 w-32 bg-gray-200 dark:bg-white/5 rounded" />
                            </div>
                            <div className="h-10 w-64 bg-gray-200 dark:bg-white/5 rounded-lg" />
                        </div>
                        <div className="h-12 w-36 bg-gray-100 dark:bg-white/5 rounded-xl" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-64 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5" />
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Skeleton Noticias */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center">
                                <div className="w-1.5 h-7 bg-cyan-400/50 mr-3 shrink-0 rounded-full" />
                                <div className="h-8 w-48 bg-gray-200 dark:bg-white/5 rounded-lg animate-pulse" />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-16 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
                                <ChevronRight size={16} className="text-gray-300 dark:text-gray-700" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="block relative rounded-2xl bg-[#090f11]/5 border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col h-[380px] animate-pulse">
                                    <div className="relative w-full h-48 md:h-52 bg-gray-200 dark:bg-slate-800/50" />
                                    <div className="p-5 flex flex-col flex-grow bg-white dark:bg-[#090f11]">
                                        <div className="h-6 w-3/4 bg-gray-200 dark:bg-white/10 rounded mb-3" />
                                        <div className="h-6 w-1/2 bg-gray-200 dark:bg-white/10 rounded mb-4" />
                                        
                                        <div className="space-y-2 mb-4 flex-grow">
                                            <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded" />
                                            <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded" />
                                            <div className="h-3 w-2/3 bg-gray-100 dark:bg-white/5 rounded" />
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5 mt-auto">
                                            <div className="h-3 w-20 bg-gray-200 dark:bg-white/10 rounded" />
                                            <div className="h-3 w-12 bg-gray-200 dark:bg-white/10 rounded" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Skeleton Sidebar (Eventos y Comunidad) */}
                    <div className="space-y-12">
                        {/* Eventos */}
                        <div className="p-1">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-2 h-8 bg-purple-600/30 rounded-full" />
                                <div className="h-8 w-48 bg-gray-200 dark:bg-white/5 rounded-lg animate-pulse" />
                            </div>
                            
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="p-5 rounded-[2rem] bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] shadow-sm animate-pulse">
                                        <div className="flex items-center justify-between gap-3 mb-4">
                                            <div className="h-5 w-16 bg-purple-500/10 rounded-lg border border-purple-500/20" />
                                            <div className="h-3 w-12 bg-gray-200 dark:bg-white/10 rounded" />
                                        </div>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-2 flex-1">
                                                <div className="h-4 w-full bg-gray-200 dark:bg-white/10 rounded" />
                                                <div className="h-4 w-2/3 bg-gray-200 dark:bg-white/10 rounded" />
                                            </div>
                                            <div className="flex flex-col items-end shrink-0 gap-1">
                                                <div className="h-5 w-8 bg-gray-300 dark:bg-white/20 rounded" />
                                                <div className="h-2 w-6 bg-gray-200 dark:bg-white/10 rounded" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Comunidad */}
                        <div className="pt-4">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-8 bg-orange-600/30 rounded-full" />
                                    <div className="h-8 w-32 bg-gray-200 dark:bg-white/5 rounded-lg animate-pulse" />
                                </div>
                                <div className="h-4 w-16 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
                            </div>
                            
                            <div className="space-y-5">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="p-5 rounded-[1.5rem] bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.02] shadow-sm animate-pulse">
                                        <div className="space-y-2 mb-5">
                                            <div className="h-4 w-full bg-gray-200 dark:bg-white/10 rounded" />
                                            <div className="h-4 w-3/4 bg-gray-200 dark:bg-white/10 rounded" />
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-gray-300 dark:bg-white/10" />
                                                <div className="h-3 w-16 bg-gray-200 dark:bg-white/10 rounded" />
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MessageSquare size={12} className="text-gray-300 dark:text-gray-700" />
                                                <div className="h-3 w-8 bg-gray-200 dark:bg-white/10 rounded" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
